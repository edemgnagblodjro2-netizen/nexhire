import { type ProvinceCode } from "@/data/services";

export interface Province211Info {
  dial: string;
  display: string;
  website: string;
  textNumber?: string;
}

export const PROVINCE_211: Record<ProvinceCode, Province211Info> = {
  QC: { dial: "211",          display: "211",            website: "https://www.211qc.ca",      textNumber: "211" },
  ON: { dial: "211",          display: "211",            website: "https://211ontario.ca",     textNumber: "21166" },
  BC: { dial: "211",          display: "211",            website: "https://bc.211.ca",         textNumber: "211" },
  AB: { dial: "211",          display: "211",            website: "https://ab.211.ca",         textNumber: "211" },
  MB: { dial: "211",          display: "211",            website: "https://mb.211.ca",         textNumber: "211" },
  SK: { dial: "211",          display: "211",            website: "https://sk.211.ca",         textNumber: "211" },
  NB: { dial: "211",          display: "211",            website: "https://nb.211.ca",         textNumber: "211" },
  NS: { dial: "211",          display: "211",            website: "https://ns.211.ca",         textNumber: "211" },
  PE: { dial: "211",          display: "211",            website: "https://pe.211.ca",         textNumber: "211" },
  NL: { dial: "211",          display: "211",            website: "https://nl.211.ca",         textNumber: "211" },
  YT: { dial: "1-800-661-0408", display: "1-800-661-0408 (YT)", website: "https://yukon.ca/en/health-and-wellness" },
  NT: { dial: "1-800-661-0844", display: "1-800-661-0844 (NT)", website: "https://www.hss.gov.nt.ca" },
  NU: { dial: "1-800-265-3333", display: "Kamatsiaqtut 1-800-265-3333 (NU)", website: "https://www.gov.nu.ca/health" },
};

export function getProvince211(p: ProvinceCode): Province211Info {
  return PROVINCE_211[p] ?? PROVINCE_211.QC;
}
