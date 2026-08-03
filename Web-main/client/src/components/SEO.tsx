import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  schema?: Record<string, any> | Record<string, any>[];
}

export default function SEO({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage = '/og-image.jpg',
  schema
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title.includes('Viettel') ? title : `${title} | Viettel AI`;
    document.title = formattedTitle;

    // Helper to create or update meta tags
    const updateMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (element) {
        element.setAttribute('content', contentValue);
      } else {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        element.setAttribute('content', contentValue);
        document.head.appendChild(element);
      }
    };

    // 2. Update Description
    if (description) {
      updateMetaTag('name', 'description', description);
      updateMetaTag('property', 'og:description', description);
      updateMetaTag('property', 'twitter:description', description);
    }

    // 3. Update OG & Twitter titles
    updateMetaTag('property', 'og:title', formattedTitle);
    updateMetaTag('property', 'twitter:title', formattedTitle);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'twitter:image', ogImage);

    // 4. Update Canonical Link
    const currentUrl = canonicalUrl || window.location.href;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', currentUrl);
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', currentUrl);
      document.head.appendChild(canonicalLink);
    }

    // 5. Update/Inject Schema JSON-LD
    let schemaScript = document.getElementById('seo-schema-jsonld') as HTMLScriptElement;
    if (schema) {
      const jsonContent = JSON.stringify(schema);
      if (schemaScript) {
        schemaScript.textContent = jsonContent;
      } else {
        schemaScript = document.createElement('script');
        schemaScript.id = 'seo-schema-jsonld';
        schemaScript.type = 'application/ld+json';
        schemaScript.textContent = jsonContent;
        document.head.appendChild(schemaScript);
      }
    } else {
      if (schemaScript) {
        schemaScript.remove();
      }
    }
  }, [title, description, canonicalUrl, ogType, ogImage, schema]);

  return null;
}
