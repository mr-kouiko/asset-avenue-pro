/**
 * SEO-optimized thematic collections (SEO hubs)
 * These pages target high-value search queries and improve internal linking
 */

export interface SEOCollection {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  seoContent: string;
  searchQueries: string[]; // Database search terms
  relatedCollections: string[]; // Related collection slugs
  relatedCategories: string[]; // Category slugs to link
  faq: Array<{ question: string; answer: string }>;
  priority: number; // 1-10, higher = more important for sitemap
}

export const seoCollections: SEOCollection[] = [
  // Business & Corporate
  {
    id: 'business',
    slug: 'business',
    name: 'Business',
    title: 'Business Stock Photos, Videos & Audio | VisuStock',
    description: 'Professional business content for corporate presentations, marketing materials, and commercial projects. High-quality stock assets featuring offices, teamwork, and professional settings.',
    h1: 'Business & Corporate Stock Media',
    seoContent: `**Professional business content** for every corporate need. Our curated collection features authentic workplace imagery, team collaboration scenes, and executive-level visuals that elevate your brand presence.

Whether you're creating a **corporate presentation**, updating your website, or producing marketing materials, find the perfect business assets to communicate professionalism and success.

From **startup culture** to Fortune 500 boardrooms, our business collection spans industries and styles to match your brand identity.`,
    searchQueries: ['business', 'corporate', 'office', 'meeting', 'professional', 'team', 'workplace', 'executive'],
    relatedCollections: ['technology', 'finance', 'marketing'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'What types of business content are available?', answer: 'We offer photos, videos, and audio featuring office environments, team meetings, professional portraits, corporate events, and workplace technology scenes.' },
      { question: 'Can I use these images for commercial purposes?', answer: 'Yes! All content comes with commercial licenses. Our Standard License covers most business uses, while the Extended License allows unlimited commercial applications.' },
      { question: 'Are there images of diverse teams?', answer: 'Absolutely. Our business collection features diverse teams across age, ethnicity, and gender to authentically represent modern workplaces.' }
    ],
    priority: 10
  },
  
  // Technology & Digital
  {
    id: 'technology',
    slug: 'technology',
    name: 'Technology',
    title: 'Technology Stock Photos & Videos | Tech Media | VisuStock',
    description: 'Cutting-edge technology content featuring devices, software interfaces, AI concepts, and digital innovation. Perfect for tech companies, startups, and digital marketing.',
    h1: 'Technology & Digital Stock Media',
    seoContent: `**Technology-focused stock content** for the digital age. Our collection showcases the latest in tech imagery—from smartphones and laptops to abstract data visualizations and AI concepts.

Ideal for **tech startups**, software companies, and digital agencies seeking modern, forward-thinking visuals that resonate with tech-savvy audiences.

Explore content featuring **coding**, cybersecurity, cloud computing, artificial intelligence, and emerging technologies.`,
    searchQueries: ['technology', 'tech', 'computer', 'laptop', 'smartphone', 'coding', 'digital', 'software', 'AI', 'artificial intelligence'],
    relatedCollections: ['business', 'education', 'innovation'],
    relatedCategories: ['photo', 'video', 'vector'],
    faq: [
      { question: 'Do you have AI and machine learning imagery?', answer: 'Yes, we have an extensive collection of AI concepts, neural networks, data science visualizations, and machine learning illustrations.' },
      { question: 'Are there technology videos for presentations?', answer: 'Absolutely! Our tech video collection includes software demos, device close-ups, data animations, and abstract tech backgrounds.' }
    ],
    priority: 9
  },
  
  // Nature & Environment
  {
    id: 'nature',
    slug: 'nature',
    name: 'Nature',
    title: 'Nature Stock Photos & Videos | Landscapes | VisuStock',
    description: 'Stunning nature photography and videos featuring landscapes, wildlife, forests, oceans, and natural phenomena. Perfect for environmental projects and wellness brands.',
    h1: 'Nature & Landscape Stock Media',
    seoContent: `**Breathtaking nature content** that captures Earth's beauty. From majestic mountain ranges to serene forest scenes, our nature collection brings the outdoors to your projects.

Perfect for **environmental organizations**, travel companies, wellness brands, and anyone seeking to connect their audience with the natural world.

Explore **wildlife photography**, seasonal landscapes, underwater scenes, and aerial nature footage that inspires and captivates.`,
    searchQueries: ['nature', 'landscape', 'forest', 'mountain', 'ocean', 'wildlife', 'trees', 'flowers', 'sunset', 'water'],
    relatedCollections: ['travel', 'animals', 'seasons'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are drone nature videos available?', answer: 'Yes! We offer stunning aerial footage of landscapes, coastlines, forests, and natural landmarks captured by professional drone cinematographers.' },
      { question: 'Can I find seasonal nature content?', answer: 'Absolutely. Our collection includes spring blooms, summer beaches, autumn foliage, and winter wonderlands.' }
    ],
    priority: 9
  },
  
  // Travel & Adventure
  {
    id: 'travel',
    slug: 'travel',
    name: 'Travel',
    title: 'Travel Stock Photos & Videos | Destinations | VisuStock',
    description: 'Wanderlust-inspiring travel content featuring destinations worldwide, adventure activities, and cultural experiences. Ideal for tourism and hospitality brands.',
    h1: 'Travel & Adventure Stock Media',
    seoContent: `**World-class travel content** that transports viewers to destinations around the globe. Our collection features iconic landmarks, hidden gems, and authentic cultural experiences.

Essential for **travel agencies**, hospitality brands, airlines, and content creators in the tourism industry seeking to inspire wanderlust.

Discover content from **every continent**—European cities, Asian temples, African safaris, American national parks, and tropical island paradises.`,
    searchQueries: ['travel', 'vacation', 'destination', 'tourism', 'adventure', 'landmark', 'hotel', 'beach', 'city'],
    relatedCollections: ['nature', 'culture', 'food'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Which destinations are covered?', answer: 'Our travel collection spans all continents with content from popular tourist destinations, emerging hotspots, and off-the-beaten-path locations.' },
      { question: 'Are there luxury travel images?', answer: 'Yes, we feature premium content including 5-star hotels, first-class experiences, yacht trips, and luxury resort imagery.' }
    ],
    priority: 8
  },
  
  // Food & Cuisine
  {
    id: 'food',
    slug: 'food',
    name: 'Food & Cuisine',
    title: 'Food Stock Photos & Videos | Restaurant Media | VisuStock',
    description: 'Mouth-watering food photography and videos featuring dishes, ingredients, cooking, and dining experiences. Perfect for restaurants, food brands, and recipe content.',
    h1: 'Food & Culinary Stock Media',
    seoContent: `**Appetizing food content** that makes viewers hungry. Our culinary collection showcases gourmet dishes, fresh ingredients, cooking techniques, and dining experiences.

Perfect for **restaurants**, food delivery apps, recipe websites, and culinary brands seeking to present food in its most delicious light.

From **farm-to-table ingredients** to Michelin-star presentations, find the perfect food visuals for any gastronomic project.`,
    searchQueries: ['food', 'cooking', 'restaurant', 'cuisine', 'recipe', 'ingredients', 'dining', 'chef', 'healthy'],
    relatedCollections: ['lifestyle', 'health', 'culture'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are there healthy food options?', answer: 'Yes! Our collection includes extensive healthy eating content—salads, smoothies, organic ingredients, and balanced meal presentations.' },
      { question: 'Can I find cooking process videos?', answer: 'Absolutely. We offer step-by-step cooking videos, chef techniques, and food preparation content perfect for recipe sites and cooking shows.' }
    ],
    priority: 8
  },
  
  // Health & Wellness
  {
    id: 'health',
    slug: 'health-wellness',
    name: 'Health & Wellness',
    title: 'Health & Wellness Stock Photos | Medical Media | VisuStock',
    description: 'Health-focused content featuring fitness, medical, mental wellness, and healthy lifestyle imagery. Ideal for healthcare providers and wellness brands.',
    h1: 'Health & Wellness Stock Media',
    seoContent: `**Health and wellness content** for the modern wellness industry. Our collection covers fitness, medical care, mental health, nutrition, and holistic wellness practices.

Trusted by **healthcare providers**, fitness brands, wellness apps, and pharmaceutical companies seeking authentic, professional health imagery.

Explore content spanning **yoga and meditation**, gym workouts, medical consultations, healthy eating, and self-care rituals.`,
    searchQueries: ['health', 'wellness', 'fitness', 'medical', 'yoga', 'exercise', 'gym', 'meditation', 'doctor', 'hospital'],
    relatedCollections: ['fitness', 'food', 'lifestyle'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Is medical content HIPAA-compliant?', answer: 'All our medical imagery uses professional models or stock scenarios. No real patient information is ever depicted.' },
      { question: 'Are there mental health images?', answer: 'Yes, we have a growing collection featuring therapy sessions, mindfulness practices, emotional wellness, and mental health awareness imagery.' }
    ],
    priority: 8
  },
  
  // Education & Learning
  {
    id: 'education',
    slug: 'education',
    name: 'Education',
    title: 'Education Stock Photos & Videos | Learning Media | VisuStock',
    description: 'Educational content featuring classrooms, students, e-learning, and academic settings. Perfect for schools, universities, and EdTech companies.',
    h1: 'Education & Learning Stock Media',
    seoContent: `**Education-focused stock content** for academic and e-learning platforms. Our collection captures the learning experience—from elementary classrooms to university lectures and online courses.

Essential for **schools**, universities, EdTech startups, and educational publishers creating engaging learning materials.

Find content featuring **diverse students**, innovative teaching methods, remote learning, and educational technology.`,
    searchQueries: ['education', 'school', 'student', 'learning', 'teacher', 'classroom', 'university', 'study', 'online learning'],
    relatedCollections: ['technology', 'children', 'business'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are there images of online learning?', answer: 'Yes! Our collection features extensive e-learning content including virtual classrooms, video conferencing, and remote education scenarios.' },
      { question: 'Do you have content for all education levels?', answer: 'Absolutely—from preschool and K-12 to higher education and professional development.' }
    ],
    priority: 7
  },
  
  // Lifestyle & People
  {
    id: 'lifestyle',
    slug: 'lifestyle',
    name: 'Lifestyle',
    title: 'Lifestyle Stock Photos | People & Living | VisuStock',
    description: 'Authentic lifestyle content featuring real people, daily life, relationships, and modern living. Perfect for brands seeking relatable, genuine imagery.',
    h1: 'Lifestyle & People Stock Media',
    seoContent: `**Authentic lifestyle content** that connects with real audiences. Our collection features genuine moments, diverse people, and relatable scenarios that resonate with modern consumers.

Perfect for **consumer brands**, social media marketing, and advertising campaigns seeking authentic human connection.

Explore content spanning **family life**, friendships, hobbies, home living, and everyday moments that tell compelling stories.`,
    searchQueries: ['lifestyle', 'people', 'family', 'friends', 'home', 'living', 'daily', 'modern', 'authentic'],
    relatedCollections: ['family', 'health', 'fashion'],
    relatedCategories: ['photo', 'video'],
    faq: [
      { question: 'Are the people in images diverse?', answer: 'Yes! We prioritize diverse representation across age, ethnicity, body type, ability, and lifestyle to authentically reflect modern society.' },
      { question: 'Can I find non-staged lifestyle images?', answer: 'Absolutely. Many of our lifestyle images capture candid, documentary-style moments rather than posed scenarios.' }
    ],
    priority: 9
  },
  
  // Music & Audio
  {
    id: 'music',
    slug: 'music-audio',
    name: 'Music & Audio',
    title: 'Royalty-Free Music & Audio | Sound Effects | VisuStock',
    description: 'Professional royalty-free music tracks, sound effects, and audio content. Perfect for video production, podcasts, games, and multimedia projects.',
    h1: 'Royalty-Free Music & Audio',
    seoContent: `**Professional audio content** for multimedia projects. Our music and sound library features original compositions, ambient tracks, and sound effects for every creative need.

Essential for **video producers**, podcast creators, game developers, and advertising agencies seeking high-quality, licensable audio.

Explore genres from **cinematic orchestral** to upbeat pop, ambient soundscapes to punchy sound effects.`,
    searchQueries: ['music', 'audio', 'sound', 'soundtrack', 'ambient', 'beats', 'instrumental'],
    relatedCollections: ['video', 'podcast', 'entertainment'],
    relatedCategories: ['audio'],
    faq: [
      { question: 'Are music tracks royalty-free?', answer: 'Yes! All audio content includes royalty-free licensing. Pay once and use in your projects without ongoing royalty payments.' },
      { question: 'Can I use music in YouTube videos?', answer: 'Absolutely. Our licenses cover YouTube, social media, podcasts, and commercial video projects.' }
    ],
    priority: 7
  },
  
  // Abstract & Backgrounds
  {
    id: 'abstract',
    slug: 'abstract-backgrounds',
    name: 'Abstract & Backgrounds',
    title: 'Abstract Backgrounds & Textures | Design Assets | VisuStock',
    description: 'Creative abstract visuals, backgrounds, textures, and patterns. Perfect for web design, presentations, and digital artwork.',
    h1: 'Abstract Backgrounds & Textures',
    seoContent: `**Creative abstract content** for designers and creators. Our collection features stunning backgrounds, seamless patterns, textures, and abstract art for versatile creative applications.

Essential for **web designers**, presentation creators, social media managers, and digital artists seeking unique visual foundations.

Explore **geometric patterns**, gradient backgrounds, particle effects, and artistic textures in every color and style.`,
    searchQueries: ['abstract', 'background', 'texture', 'pattern', 'gradient', 'geometric', 'design', 'wallpaper'],
    relatedCollections: ['technology', 'art', 'design'],
    relatedCategories: ['photo', 'vector', 'video'],
    faq: [
      { question: 'Are backgrounds available in multiple resolutions?', answer: 'Yes! Most backgrounds are available in 4K resolution and can be scaled for various applications.' },
      { question: 'Can I find animated backgrounds?', answer: 'Absolutely. Our video collection includes seamlessly looping abstract motion backgrounds.' }
    ],
    priority: 6
  }
];

/**
 * Get a collection by slug
 */
export function getCollectionBySlug(slug: string): SEOCollection | undefined {
  return seoCollections.find(c => c.slug === slug);
}

/**
 * Get related collections for a given collection
 */
export function getRelatedCollections(slug: string): SEOCollection[] {
  const collection = getCollectionBySlug(slug);
  if (!collection) return [];
  
  return collection.relatedCollections
    .map(s => getCollectionBySlug(s))
    .filter((c): c is SEOCollection => c !== undefined);
}

/**
 * Get all collections sorted by priority
 */
export function getAllCollections(): SEOCollection[] {
  return [...seoCollections].sort((a, b) => b.priority - a.priority);
}
