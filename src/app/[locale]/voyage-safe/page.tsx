import { TravelSafeClient } from '@/components/TravelSafeClient';
import { listAllCountries, getCountryHelp } from '@/lib/lgbt-helplines';

export const dynamic = 'force-static';
export const metadata = {
  title: 'Voyage safe LGBTQ+ — parislgbt',
  description: 'Avant de partir, vérifie le statut LGBT de ta destination, prépare ta checklist sécurité, et garde tous les contacts d\'urgence à portée.'
};

export default function VoyageSafePage() {
  const countries = listAllCountries().map(code => {
    const help = getCountryHelp(code);
    return {
      code,
      name: help?.countryName || code,
      riskLevel: help?.riskLevel || 'unknown',
      helplinesCount: help?.helplines.length || 0
    };
  });

  return <TravelSafeClient countries={countries} />;
}
