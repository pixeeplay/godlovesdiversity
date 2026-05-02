import { CartView } from '@/components/CartView';

export const metadata = { title: 'Mon panier — God Loves Diversity' };

export default function CartPage() {
  return (
    <main className="min-h-screen py-12">
      <div className="container-tight">
        <h1 className="text-4xl font-display font-black mb-8 gradient-text">Mon panier</h1>
        <CartView />
      </div>
    </main>
  );
}
