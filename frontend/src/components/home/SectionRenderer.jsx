import React, { useRef } from 'react';
import { HomeNavbar, HomeHeroBanner, HomeThirdBanner, HomeCategoryGrid, HomeCategoriesGrid, HomeProductGrid, HomeReviews, HomeFooter } from './HomeComponents';

export default function SectionRenderer({ section, context, isPreview = false, renderedTypes = null }) {
    if (!section || !section.visible) return null;

    const type = section.sectionType || section.id;
    const instanceId = section.id.includes('_') ? section.id.split('_')[1] : null;

    // For categoryGrid: only render the FIRST occurrence, skip the rest
    // (all grids are collected in context.categoryGrids and shown in one container)
    if (type === 'categoryGrid' && renderedTypes) {
        if (renderedTypes.has('categoryGrid')) return null;
        renderedTypes.add('categoryGrid');
    }

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
        case 'categoriesGrid':
            if (instanceId && context.categoriesGrids) {
                specificData = context.categoriesGrids.find(b => b._id === instanceId);
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
            // Always pass null specificData so HomeCategoryGrid uses all context.categoryGrids
            return <HomeCategoryGrid context={context} section={section} specificData={null} isPreview={isPreview} />;
        case 'categoriesGrid':
            return <HomeCategoriesGrid {...props} />;
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
