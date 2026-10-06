import React, { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';

export const SEOHead: React.FC = () => {
  const { currentTab, selectedProductId, products } = useStore();

  useEffect(() => {
    let title = "Unx Games – Nepal's #1 Game Top-Up & Voucher App";
    let description =
      "Nepal's premier gaming top-up store for Free Fire Diamonds, PUBG Mobile UC, Roblox Robux, and Mobile Legends. Fast 5-15 min UID delivery via eSewa & Khalti QR.";
    let canonicalUrl = 'https://www.intrax.in/';

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (selectedProduct) {
      const startingPrice = selectedProduct.packages?.[0]?.price;
      title = `${selectedProduct.name} Top-Up in Nepal | Unx Games`;
      description = `Instant ${selectedProduct.name} top-up in Nepal${
        startingPrice ? ` starting at Rs. ${startingPrice}` : ''
      }. 5-15 minute delivery directly to Player UID via eSewa, Khalti, and Gamer Wallet.`;
      canonicalUrl = `https://www.intrax.in/?product=${encodeURIComponent(selectedProduct.id)}`;
    } else {
      switch (currentTab) {
        case 'shop':
          title = "Game Top-Up Catalog & Diamond Rates | Unx Games Nepal";
          description =
            "Browse all gaming top-ups in Nepal: Free Fire Diamonds, PUBG UC, Roblox Robux, Mobile Legends, and Valorant Points. Verified instant UID delivery.";
          canonicalUrl = 'https://www.intrax.in/?tab=shop';
          break;
        case 'orders':
          title = "Track Game Top-Up Orders & UID Delivery | Unx Games";
          description =
            "Check live order tracking status for Free Fire, PUBG, and gaming packages. Real-time verification and UID delivery progress.";
          canonicalUrl = 'https://www.intrax.in/?tab=orders';
          break;
        case 'wallet':
          title = "Gamer Wallet – Instant 1-Tap Top-Up Balance | Unx Games";
          description =
            "Recharge your Unx Gamer Wallet with eSewa, Khalti, or Mobile Banking for zero-fee, instant 1-tap gaming top-up checkouts.";
          canonicalUrl = 'https://www.intrax.in/?tab=wallet';
          break;
        case 'support':
        case 'ai_support':
          title = "24/7 Human Customer Care & Gaming Concierge | Unx Games";
          description =
            "Need help with your top-up, payment verification, or Player UID? Contact Unx Games 24/7 support hotline and WhatsApp manager.";
          canonicalUrl = 'https://www.intrax.in/?tab=support';
          break;
        default:
          break;
      }
    }

    // Update document title
    document.title = title;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Update OpenGraph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    // Update Twitter
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', description);

    // Dynamic Product Schema.org JSON-LD
    const existingProductSchema = document.getElementById('dynamic-product-jsonld');
    if (existingProductSchema) {
      existingProductSchema.remove();
    }

    if (selectedProduct) {
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: selectedProduct.name,
        image: (selectedProduct as any).image || (selectedProduct as any).imageUrl || (selectedProduct as any).image_url || 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
        description: selectedProduct.description || description,
        brand: {
          '@type': 'Brand',
          name: 'Unx Games',
        },
        offers: (selectedProduct.packages || []).map((pkg) => ({
          '@type': 'Offer',
          name: pkg.name,
          price: pkg.price,
          priceCurrency: 'NPR',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          seller: {
            '@type': 'Organization',
            name: 'Unx Games',
          },
        })),
      };

      const script = document.createElement('script');
      script.id = 'dynamic-product-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(productSchema);
      document.head.appendChild(script);
    }
  }, [currentTab, selectedProductId, products]);

  return null;
};
