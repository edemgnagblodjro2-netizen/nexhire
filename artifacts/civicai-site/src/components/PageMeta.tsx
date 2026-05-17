import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl: string;
  ogImage?: string;
}

const BASE_OG_IMAGE = "https://www.civicai.ca/civicai-banner.png";

function setMeta(property: string, content: string, attr: "name" | "property" = "property") {
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function PageMeta({
  title,
  description,
  ogTitle,
  ogDescription,
  ogUrl,
  ogImage = BASE_OG_IMAGE,
}: PageMetaProps) {
  useEffect(() => {
    document.title = title;

    setMeta("description", description, "name");
    setMeta("robots", "index, follow", "name");

    setMeta("og:title", ogTitle ?? title);
    setMeta("og:description", ogDescription ?? description);
    setMeta("og:type", "website");
    setMeta("og:url", ogUrl);
    setMeta("og:image", ogImage);

    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", ogTitle ?? title, "name");
    setMeta("twitter:description", ogDescription ?? description, "name");
    setMeta("twitter:image", ogImage, "name");

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      canonical.href = ogUrl;
    } else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = ogUrl;
      document.head.appendChild(link);
    }
  }, [title, description, ogTitle, ogDescription, ogUrl, ogImage]);

  return null;
}
