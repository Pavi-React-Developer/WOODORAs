import React from 'react';
import { HomeNavbar, HomeHeroBanner, HomeThirdBanner, HomeCategoryGrid, HomeProductGrid, HomeReviews, HomeFooter } from './HomeComponents';

export default function SectionRenderer({ section, context, isPreview = false }) {
    if (!section || !section.visible) return null;

    const type = section.sectionType || section.id;
    const instanceId = section.id.includes('_') ? section.id.split('_')[1] : null;

    let specificData = null;
    switch (type) {
        case 'heroBanner':
            if (instanceId && context.heroBanners) {
                specificData = context.heroBanners.find(b => b._id === instanceId);
            }
            break;
        case 'thirdBanner':
            if (instanceId && context.thirdBanners) {
                specificData = context.thirdBanners.find(b => b._id === instanceId);
            }
            break;
        case 'categoryGrid':
            if (instanceId && context.categoryGrids) {
                specificData = context.categoryGrids.find(b => b._id === instanceId);
            }
            break;
        case 'productGrid':
            if (instanceId && context.productGrids) {
                specificData = context.productGrids.find(b => b._id === instanceId);
            }
            break;
    }

    const props = { context, section, specificData, isPreview };

    switch (type) {
        case 'navbar':
            return <HomeNavbar {...props} />;
        case 'heroBanner':
            return <HomeHeroBanner {...props} />;
        case 'thirdBanner':
            return <HomeThirdBanner {...props} />;
        case 'categoryGrid':
            return <HomeCategoryGrid {...props} />;
        case 'productGrid':
            return <HomeProductGrid {...props} />;
        case 'reviews':
            return <HomeReviews {...props} />;
        case 'footer':
            return <HomeFooter {...props} />;
        default:
            return null;
    }
}
