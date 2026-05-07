import { CerclesPriereLive } from '@/components/CerclesPriereLive';

export const metadata = {
  title: 'Cercles de prière inclusifs · Live · GLD',
  description: '9 cercles de prière LGBT-friendly en direct — catholique, protestant, orthodoxe, musulman, juif, bouddhiste, hindou, sikh, inter-religieux. Présence live, intentions partagées.'
};
export const dynamic = 'force-dynamic';

export default function CerclesPrierePage() {
  return <CerclesPriereLive />;
}
