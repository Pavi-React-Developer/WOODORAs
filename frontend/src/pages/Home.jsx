import React, { useState, useEffect } from 'react';
import { catalogService } from '../api/catalogService';

// ── Mock data for the static sections ───────────────────────────────────────────
const COLLECTIONS = [
  { name: 'Wooden Toys', image: '/rainbow_stacker.png' },
  { name: 'Nursery Decor', image: '/wooden_train_set.png' },
  { name: 'Gift Sets', image: '/geometry_sorter.png' },
  { name: 'Personalized', image: '/log_cabin_blocks.png' },
];

const TESTIMONIALS = [
  {
    rating: 5,
    quote: "The quality is exceptional. You can feel the craftsmanship in every piece. My daughter plays with the stacking set every single day.",
    author: "Sarah M.",
    context: "Verified Buyer"
  },
  {
    rating: 5,
    quote: "Beautifully designed and sustainably made. It's rare to find toys that look this good in a living room while being so engaging for kids.",
    author: "David R.",
    context: "Verified Buyer"
  },
  {
    rating: 5,
    quote: "The personalized name puzzle was the perfect gift for my nephew. Fast shipping and the wood feels incredibly smooth and safe.",
    author: "Elena T.",
    context: "Verified Buyer"
  },
];

const BLOG_POSTS = [
  {
    tag: 'MINDFUL PLAY',
    title: 'The Benefits of Open-Ended Wooden Toys',
    desc: 'Why simplifying your child’s playroom can lead to deeper focus and more creative problem solving...',
    image: '/geometry_sorter.png'
  },
  {
    tag: 'ECO-FRIENDLY',
    title: 'Creating a Toxin-Free Nursery Space',
    desc: 'Our guide to choosing materials that are safe for your baby and the planet, from paint to finishes...',
    image: '/rainbow_stacker.png'
  },
  {
    tag: 'OUR STORY',
    title: 'Inside Our Sustainable Workshop',
    desc: 'Meet the artisans who hand-finish every WoodenToys toy and learn about our commitment to reforestation...',
    image: '/log_cabin_blocks.png'
  }
];

export default function Home({ user, onNavigate, onAddToCart, onAddToWishlist }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch products from backend
    catalogService.getProducts()
      .then(data => {
        if (data && data.length > 0) {
          // Just take the first 4 for the trending section
          setProducts(data.slice(0, 4));
        }
      })
      .catch(err => console.error("Failed to load products", err));
  }, []);

  const handleAction = (type, product) => {
    if (!user) {
      alert(`Please sign in to add to ${type.toLowerCase()}.`);
      onNavigate('login');
      return;
    }
    if (type === 'Cart') {
      onAddToCart?.(product);
    } else {
      onAddToWishlist?.(product);
    }
  };

  // ── Star Component ──
  const Stars = ({ rating }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className="w-2.5 h-2.5 text-brand-dark" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );

  return (
    <div className="bg-brand-light font-sans text-brand-dark">

      {/* ── HERO SECTION ── */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center">
        {/* Background image container */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/rainbow_stacker.png" 
            alt="Hero Wooden Blocks" 
            className="w-full h-full object-cover object-center filter brightness-95"
            onError={(e) => {
              // fallback if image not found to a solid elegant color
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-brand-beige');
            }}
          />
          {/* Subtle gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase mb-4">
              Sustainable &amp; Timeless
            </p>
            <h1 className="font-sans text-5xl md:text-6xl font-medium text-white leading-[1.1] tracking-tight mb-6">
              Play that grows<br />with them.
            </h1>
            <p className="text-white/90 text-sm md:text-base leading-relaxed mb-10 max-w-md font-light">
              Our heirloom quality wooden toys are designed to spark curiosity, creativity, and conscious growth in every child.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button className="bg-brand-dark text-white text-xs font-bold px-8 py-4 uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2">
                Build Your Box <span className="text-[10px]">➔</span>
              </button>
              <button className="bg-white text-brand-dark border border-transparent text-xs font-bold px-8 py-4 uppercase tracking-widest hover:border-brand-dark transition-colors">
                New Arrivals
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SHOP BY AGE RIBBON ── */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <div className="py-4 md:py-6 md:pr-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full md:w-auto text-center md:text-left">
            Shop By Age
          </div>
          <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 text-center">
            <button className="py-4 md:py-6 hover:bg-gray-50 transition-colors group">
              <span className="block text-sm font-bold text-brand-dark group-hover:text-black">0-6</span>
              <span className="block text-[9px] text-brand-medium uppercase tracking-widest mt-1">Months</span>
            </button>
            <button className="py-4 md:py-6 hover:bg-gray-50 transition-colors group">
              <span className="block text-sm font-bold text-brand-dark group-hover:text-black">6-12</span>
              <span className="block text-[9px] text-brand-medium uppercase tracking-widest mt-1">Months</span>
            </button>
            <button className="py-4 md:py-6 hover:bg-gray-50 transition-colors group">
              <span className="block text-sm font-bold text-brand-dark group-hover:text-black">1-2</span>
              <span className="block text-[9px] text-brand-medium uppercase tracking-widest mt-1">Years</span>
            </button>
            <button className="py-4 md:py-6 hover:bg-gray-50 transition-colors group">
              <span className="block text-sm font-bold text-brand-dark group-hover:text-black">3+</span>
              <span className="block text-[9px] text-brand-medium uppercase tracking-widest mt-1">Years</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── CURATED COLLECTIONS ── */}
      <section id="collections" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-serif text-brand-dark">Curated Collections</h2>
          <p className="text-xs text-brand-medium mt-2">Discover toys that inspire open-ended exploration.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLLECTIONS.map((col, i) => (
            <div key={i} className="relative group cursor-pointer aspect-square overflow-hidden bg-brand-beige">
              <img 
                src={col.image} 
                alt={col.name} 
                className="w-full h-full object-cover mix-blend-multiply opacity-80 group-hover:scale-105 transition-transform duration-700" 
                onError={(e) => { e.target.style.display='none'; }}
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <span className="bg-white/90 backdrop-blur text-brand-dark text-[9px] font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-full shadow-sm">
                  {col.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRENDING SETS ── */}
      <section id="trending" className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Trending Sets</h2>
              <p className="text-xs text-brand-medium mt-1">Chosen by parents this week.</p>
            </div>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark">
              View All &gt;
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div
                key={p._id || p.id}
                className="group relative cursor-pointer"
                onClick={() => onNavigate('product-detail', p)}
              >
                {/* Image block */}
                <div className="aspect-square bg-[#F8F8F8] p-4 relative mb-4">
                  <img 
                    src={p.images?.[0] || p.image || '/wooden_train_set.png'} 
                    alt={p.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAction('Cart', p); }}
                      className="bg-white text-brand-dark text-[10px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-brand-dark hover:text-white transition-colors shadow-sm"
                    >
                      Add to Cart
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAction('Wishlist', p); }}
                      className="bg-white text-brand-dark p-2 hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm text-brand-dark font-medium">{p.name}</h3>
                    <p className="text-sm text-brand-medium mt-1">${p.price?.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#F9F9F9] px-1.5 py-0.5 rounded">
                    <svg className="w-2.5 h-2.5 text-[#D4C9B8]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <span className="text-[10px] text-brand-medium">4.9</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT PARENTS LOVE ── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-serif text-brand-dark">What Parents Love</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-gray-100 p-8 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <Stars rating={t.rating} />
                </div>
                <p className="text-sm italic text-brand-dark leading-relaxed">"{t.quote}"</p>
              </div>
              <div className="flex items-center gap-3 mt-8">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-brand-dark">{t.author}</p>
                  <p className="text-[9px] text-brand-medium">{t.context}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FROM THE BLOG ── */}
      <section id="blog" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">From the WoodBaby Blog</h2>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-brand-medium hover:text-brand-dark border-b border-brand-medium pb-0.5">
              Read More
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[4/3] bg-brand-beige overflow-hidden mb-4">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700" onError={(e) => { e.target.style.display='none'; }}/>
                </div>
                <p className="text-[9px] font-bold tracking-widest uppercase text-brand-medium mb-2">{post.tag}</p>
                <h3 className="text-base font-serif text-brand-dark mb-2 group-hover:text-black transition-colors">{post.title}</h3>
                <p className="text-xs text-brand-medium leading-relaxed">{post.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F3F3F3] rounded-2xl p-12 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-6 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-2xl font-serif text-brand-dark mb-3">Join the WoodenToys Family</h2>
          <p className="text-xs text-brand-medium max-w-md mx-auto mb-8">
            Get early access to new collections, gift guides, and stories about mindful parenting.
          </p>
          <form className="max-w-md mx-auto flex" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="flex-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark border-none" 
            />
            <button type="submit" className="bg-brand-dark hover:bg-black text-white px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors">
              Subscribe
            </button>
          </form>
          <p className="text-[9px] text-gray-400 mt-4">By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </section>

    </div>
  );
}
