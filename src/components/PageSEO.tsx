import { Helmet } from "react-helmet-async";

interface PageSEOProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://www.simulapool.com";
const DEFAULT_OG = `${BASE_URL}/logo-simulapool.png`;

const PageSEO = ({ title, description, path = "/", ogImage, noIndex }: PageSEOProps) => {
  const url = `${BASE_URL}${path}`;
  const image = ogImage || DEFAULT_OG;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default PageSEO;
