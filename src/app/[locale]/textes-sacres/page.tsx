import { TextesSacresClient } from '@/components/TextesSacresClient';

export const metadata = {
  title: 'Textes sacrés inclusifs · Annotations communautaires · GLD',
  description: 'Genius des textes sacrés : Bible, Coran, Talmud, Suttas, Vedas, Guru Granth Sahib annotés par la communauté inclusive.'
};
export const dynamic = 'force-dynamic';

export default function TextesSacresPage() { return <TextesSacresClient />; }
