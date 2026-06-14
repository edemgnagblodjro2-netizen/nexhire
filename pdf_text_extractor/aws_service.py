"""AWS — Cost Explorer, EC2, S3 via AWS REST API (HMAC-SHA256).

Auth : Access Key ID + Secret Access Key stockés chiffrés par organisation.
Credentials stockés par organisation. Aucune variable d'env requise.
"""
from __future__ import annotations

import json
from datetime import date, timedelta

import httpx
from connector_loader import load_creds


def _boto_query(service: str, region: str, access_key: str, secret_key: str,
                action: str, payload: dict) -> dict:
    """Appel AWS via boto3 si disponible, sinon erreur explicite."""
    try:
        import boto3
        session = boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
        client = session.client(service)
        method = getattr(client, action)
        return method(**payload)
    except ImportError:
        raise RuntimeError("boto3 non installé — ajouter boto3 aux dépendances")


def get_aws_info(org_id: str) -> dict:
    """Ping AWS — STS get_caller_identity (fonctionne avec tout compte IAM valide)."""
    creds, _ = load_creds("aws", org_id)
    if not creds:
        return {"error": "AWS non connecté"}
    access_key = creds.get("access_key_id", "").strip()
    secret_key = creds.get("secret_access_key", "").strip()
    region     = creds.get("region", "us-east-1").strip()
    if not access_key or not secret_key:
        return {"error": "Credentials AWS incomplets"}
    try:
        import boto3
        sts = boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        ).client("sts")
        identity = sts.get_caller_identity()
        return {
            "account_id": identity.get("Account"),
            "user_arn":   identity.get("Arn"),
            "user_id":    identity.get("UserId"),
            "region":     region,
        }
    except ImportError:
        return {"error": "boto3 non installé"}
    except Exception as exc:
        return {"error": str(exc)}


def query_aws(category: str, org_id: str, period: str = "current_month") -> dict:
    creds, _ = load_creds("aws", org_id)
    if not creds:
        return {"error": "AWS non connecté"}

    access_key = creds.get("access_key_id", "").strip()
    secret_key = creds.get("secret_access_key", "").strip()
    region     = creds.get("region", "us-east-1").strip()

    if not access_key or not secret_key:
        return {"error": "Credentials AWS incomplets — reconfigurer le connecteur"}

    today      = date.today()
    first_day  = today.replace(day=1).isoformat()
    last_day   = today.isoformat()

    try:
        if category == "costs":
            resp = _boto_query("ce", region, access_key, secret_key,
                "get_cost_and_usage",
                {"TimePeriod": {"Start": first_day, "End": last_day},
                 "Granularity": "MONTHLY",
                 "Metrics": ["BlendedCost"],
                 "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}]})
            results_data = resp.get("ResultsByTime", [{}])[0]
            groups = results_data.get("Groups", [])
            total_str = results_data.get("Total", {}).get("BlendedCost", {}).get("Amount", "0")
            top = sorted(groups,
                         key=lambda g: float(g["Metrics"]["BlendedCost"]["Amount"]),
                         reverse=True)[:5]
            return {
                "coût_total": f"{float(total_str):,.2f} USD",
                "période": f"{first_day} → {last_day}",
                "top_services": [
                    {"service": g["Keys"][0],
                     "coût": f"{float(g['Metrics']['BlendedCost']['Amount']):,.2f} USD"}
                    for g in top
                ],
            }

        if category == "ec2":
            resp = _boto_query("ec2", region, access_key, secret_key,
                "describe_instances", {"MaxResults": 20})
            instances = [i
                         for r in resp.get("Reservations", [])
                         for i in r.get("Instances", [])]
            running   = [i for i in instances if i.get("State", {}).get("Name") == "running"]
            stopped   = [i for i in instances if i.get("State", {}).get("Name") == "stopped"]
            return {
                "instances_total": len(instances),
                "en_cours":   len(running),
                "arrêtées":   len(stopped),
                "region":     region,
                "instances": [
                    {"id": i.get("InstanceId"), "type": i.get("InstanceType"),
                     "état": i.get("State", {}).get("Name"),
                     "nom": next((t["Value"] for t in i.get("Tags", [])
                                 if t["Key"] == "Name"), "—")}
                    for i in instances[:10]
                ],
            }

        if category == "s3":
            resp = _boto_query("s3", region, access_key, secret_key,
                "list_buckets", {})
            buckets = resp.get("Buckets", [])
            return {
                "buckets_total": len(buckets),
                "liste": [
                    {"nom": b.get("Name"), "créé": str(b.get("CreationDate", ""))}
                    for b in buckets[:20]
                ],
            }

        return {"error": f"Catégorie AWS inconnue : {category}"}

    except RuntimeError as exc:
        return {"error": str(exc)}
    except Exception as exc:
        return {"error": str(exc)}
