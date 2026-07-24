export type JsonLdObject = Record<string, unknown>;

/**
 * Renders schema.org structured data. The `<` escape is what keeps a stray
 * "</script>" inside post content from breaking out of the tag.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
