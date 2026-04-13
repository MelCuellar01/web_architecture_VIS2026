import Link from "next/link";

export const metadata = {
  title: "Legal Notice – WanderNotes",
};

export default function LegalPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Back to App</Link>
      <h1>Legal Notice (Impressum)</h1>

      <section>
        <h2>Information pursuant to § 5 TMG</h2>
        <p>
          Melissa Cuellar<br />
          Nürnberg, Deutschland<br />
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          E-Mail: cuellar-guzman23489@hs-ansbach.de
        </p>
      </section>

      <section>
        <h2>Responsible for content pursuant to § 55 Abs. 2 RStV</h2>
        <p>
          Melissa Cuellar<br />
          Nürnberg, Deutschland
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>

        <h3>Liability for Content</h3>
        <p>
          The contents of our pages were created with the greatest care. However, we cannot
          guarantee the accuracy, completeness, or timeliness of the content. As a service provider,
          we are responsible for our own content on these pages in accordance with § 7 Abs. 1 TMG
          under general law. According to §§ 8 to 10 TMG, however, we as a service provider are
          not obligated to monitor transmitted or stored third-party information or to investigate
          circumstances that indicate illegal activity.
        </p>

        <h3>Liability for Links</h3>
        <p>
          Our website contains links to external third-party websites over whose content we have
          no influence. Therefore, we cannot accept any liability for this external content. The
          respective provider or operator of the linked pages is always responsible for the content
          of those pages. The linked pages were checked for possible legal violations at the time
          of linking. Illegal content was not recognizable at the time of linking.
        </p>
      </section>

      <section>
        <h2>Copyright</h2>
        <p>
          The content and works on these pages created by the site operators are subject to German
          copyright law. Reproduction, editing, distribution, and any kind of use beyond the limits
          of copyright law require the written consent of the respective author or creator. Downloads
          and copies of this site are only permitted for private, non-commercial use.
        </p>
      </section>
    </div>
  );
}
