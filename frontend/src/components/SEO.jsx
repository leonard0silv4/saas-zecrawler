import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://mlsmarthub.com.br';
const SITE_NAME = 'ML SmartHub';

export default function SEO({ title, description, canonical, ogImage = '/logo.png' }) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${canonical}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}${ogImage}`} />
      <meta property="og:site_name" content={SITE_NAME} />
    </Helmet>
  );
}
