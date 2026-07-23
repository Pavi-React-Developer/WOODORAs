import React from 'react';
import { HomeNavbar, HomeHeroBanner, HomeThirdBanner, HomeCategoryGrid, HomeProductGrid, HomeFooter } from './HomeComponents';

export default function SectionRenderer({ section, context, isPreview = false }) {
    if (!section || !section.visible) return null;

    const props = { context, isPreview };

    switch (section.id) {
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
        case 'footer':
            return <HomeFooter {...props} />;
        default:
            return null;
    }
}
