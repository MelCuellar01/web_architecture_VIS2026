import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – WanderNotes",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Back to App</Link>
      <h1>Privacy Policy (Datenschutzerklärung)</h1>

      <section>
        <h2>1. Privacy at a Glance</h2>

        <h3>General Information</h3>
        <p>
          The following notices provide a simple overview of what happens to your personal data
          when you visit this website. Personal data is any data that can be used to personally
          identify you. For detailed information on the subject of data protection, please refer
          to our privacy policy listed below.
        </p>

        <h3>Data Collection on This Website</h3>
        <p>
          <strong>Who is responsible for data collection on this website?</strong><br />
          Data processing on this website is carried out by the website operator. You can find
          their contact details in the legal notice (Impressum) of this website.
        </p>
        <p>
          <strong>How do we collect your data?</strong><br />
          Your data is collected in part when you provide it to us (e.g. by entering data into
          forms). Other data is collected automatically by our IT systems when you visit the
          website. This is primarily technical data (e.g. internet browser, operating system,
          or time of page access).
        </p>
        <p>
          <strong>What do we use your data for?</strong><br />
          The data is collected to ensure the error-free provision of the website. The data is
          not used for analytics purposes.
        </p>
      </section>

      <section>
        <h2>2. Hosting</h2>
        <p>
          This website is hosted externally. The personal data collected on this website is
          stored on the servers of the hosting provider. This may include IP addresses, contact
          requests, meta and communication data, contract data, contact details, names, website
          access logs, and other data generated through a website.
        </p>
      </section>

      <section>
        <h2>3. General Information and Mandatory Disclosures</h2>

        <h3>Data Protection</h3>
        <p>
          The operators of this website take the protection of your personal data very seriously.
          We treat your personal data confidentially and in accordance with the statutory data
          protection regulations as well as this privacy policy.
        </p>

        <h3>Responsible Party</h3>
        <p>
          The responsible party for data processing on this website is:
        </p>
        <p>
          Melissa Cuellar<br />
          Nürnberg, Deutschland<br />
          E-Mail: cuellar-guzman23489@hs-ansbach.de
        </p>
        <p>
          The responsible party is the natural or legal person who alone or jointly with others
          decides on the purposes and means of processing personal data (e.g. names, email
          addresses, etc.).
        </p>

        <h3>Storage Duration</h3>
        <p>
          Unless a more specific storage period has been stated within this privacy policy, your
          personal data will remain with us until the purpose for data processing no longer
          applies. If you assert a legitimate request for deletion or revoke your consent to
          data processing, your data will be deleted, unless we have other legally permissible
          reasons for storing your personal data.
        </p>

        <h3>Revocation of Your Consent to Data Processing</h3>
        <p>
          Many data processing operations are only possible with your express consent. You may
          revoke any consent you have already given at any time. The legality of the data
          processing carried out until the revocation remains unaffected by the revocation.
        </p>

        <h3>Right to Lodge a Complaint with the Supervisory Authority</h3>
        <p>
          In the event of violations of the GDPR, data subjects have the right to lodge a
          complaint with a supervisory authority. This right to complain exists without prejudice
          to any other administrative or judicial remedies.
        </p>

        <h3>Right to Data Portability</h3>
        <p>
          You have the right to have data that we process automatically on the basis of your
          consent or in fulfilment of a contract handed over to you or to a third party in a
          common, machine-readable format.
        </p>

        <h3>Access, Deletion and Correction</h3>
        <p>
          Within the framework of the applicable legal provisions, you have the right at any
          time to free information about your stored personal data, its origin and recipients,
          and the purpose of data processing, and, if applicable, a right to correction or
          deletion of this data.
        </p>
      </section>

      <section>
        <h2>4. Data Collection on This Website</h2>

        <h3>Cookies</h3>
        <p>
          This website does not use tracking cookies. Only technically necessary data is stored
          in the browser&apos;s local storage (localStorage/sessionStorage) to ensure the
          functionality of the application (e.g. favorites, geocoding cache). This data is not
          shared with third parties.
        </p>

        <h3>Server Log Files</h3>
        <p>
          The provider of the pages automatically collects and stores information in so-called
          server log files, which your browser automatically transmits to us. These are:
        </p>
        <ul>
          <li>Browser type and version</li>
          <li>Operating system used</li>
          <li>Referrer URL</li>
          <li>Hostname of the accessing computer</li>
          <li>Time of the server request</li>
          <li>IP address</li>
        </ul>
        <p>
          This data is not merged with other data sources.
        </p>
      </section>

      <section>
        <h2>5. Third-Party Services</h2>

        <h3>OpenStreetMap / Nominatim</h3>
        <p>
          We use the mapping service OpenStreetMap (OSM) with tiles from CARTO for displaying
          maps, as well as the Nominatim geocoding service for location resolution. When you
          access the map feature, a connection is established to the servers of CARTO and
          OpenStreetMap. Your IP address may be transmitted to these services. For more
          information, please refer to the privacy policies of{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>{" "}
          and{" "}
          <a href="https://carto.com/privacy" target="_blank" rel="noopener noreferrer">CARTO</a>.
        </p>
      </section>
    </div>
  );
}
