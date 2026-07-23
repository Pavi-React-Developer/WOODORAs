import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLayout, publishLayout, updateDraftSections, resetDraft, setDraftVisibility } from '../../../redux/layoutSlice';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'react-hot-toast';
import SectionRenderer from '../../../components/home/SectionRenderer';
import PreviewPanel from './PreviewPanel';
import { Eye, EyeOff, GripVertical, Monitor, Tablet, Smartphone } from 'lucide-react';
import { cmsService } from '../../../api/cmsService';
import { catalogService } from '../../../api/catalogService';
import { getImageSrc } from '../../../utils/imageUtils';

// Sortable Item Component
function SortableItem({ id, visible, label }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const dispatch = useDispatch();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 mb-3 bg-white border border-[#E6DFD4] rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-brand-medium hover:text-brand-dark p-1">
                    <GripVertical size={20} />
                </div>
                <span className="font-semibold text-brand-dark">{label}</span>
            </div>
            <button
                onClick={() => dispatch(setDraftVisibility({ id, visible: !visible }))}
                className={`p-2 rounded-lg transition-colors ${visible ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                title={visible ? 'Hide section' : 'Show section'}
            >
                {visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
        </div>
    );
}

export default function HomeLayoutBuilder() {
    const [previewMode, setPreviewMode] = useState('desktop');
    const dispatch = useDispatch();
    const { draftSections, status, error } = useSelector((state) => state.layout);
    const [realContext, setRealContext] = useState(null);
    const [blocksLoaded, setBlocksLoaded] = useState(false);

    useEffect(() => {
        dispatch(fetchLayout());
        
        Promise.allSettled([
            cmsService.getHeroBanners(),
            catalogService.getShopCategories(),
            cmsService.getThirdBanners(),
            cmsService.getProductGrids(),
            cmsService.getFooter(),
            cmsService.getCategoryGrids()
        ]).then(([heroRes, categoriesRes, thirdRes, gridRes, footerRes, catGridRes]) => {
            const heroes = heroRes.status === 'fulfilled' ? heroRes.value.data || [] : [];
            const thirdBanners = thirdRes.status === 'fulfilled' ? thirdRes.value.data || [] : [];
            const productGrids = gridRes.status === 'fulfilled' ? gridRes.value.data || [] : [];
            const categoryGrids = catGridRes.status === 'fulfilled' ? catGridRes.value.data || [] : [];

            // We still build heroSlides for the preview context, but we want all models available
            let heroSlides = [];
            const activeHeroes = heroes.filter(b => b.status);
            heroSlides = activeHeroes.flatMap(banner => {
                const mediaSlides = [];
                if (banner.desktopVideo || banner.mobileVideo) {
                    mediaSlides.push({ ...banner, itemType: 'video', desktopUrl: getImageSrc(banner.desktopVideo), mobileUrl: getImageSrc(banner.mobileVideo) });
                } else if (banner.bannerImage || banner.mobileBanner) {
                    mediaSlides.push({ ...banner, itemType: 'image', desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) });
                }
                if (banner.items && banner.items.length > 0) {
                    banner.items.forEach(item => {
                        mediaSlides.push({ ...banner, itemType: item.mediaType || 'image', desktopUrl: getImageSrc(item.desktopUrl), mobileUrl: getImageSrc(item.mobileUrl) });
                    });
                }
                return mediaSlides.length > 0 ? mediaSlides : [{ ...banner, desktopUrl: getImageSrc(banner.bannerImage), mobileUrl: getImageSrc(banner.mobileBanner) }];
            });

            setRealContext({
                heroSlides,
                heroBanners: heroes,
                thirdBanners,
                productGrids,
                categoryGrids,
                shopCategories: categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : [],
                footerData: footerRes.status === 'fulfilled' ? footerRes.value.data : null,
                featuredProducts: [],
                featuredReviews: [],
                cartCount: 0,
                wishlistCount: 0,
                user: { name: 'Admin' },
                onNavigate: () => {},
            });
        });

    }, [dispatch]);

    // Reconciliation effect
    useEffect(() => {
        if (status === 'succeeded' && realContext && !blocksLoaded && draftSections.length > 0) {
            setBlocksLoaded(true);
            
            const allBlocks = [
                { id: 'navbar', sectionType: 'navbar', title: 'Navbar' },
                ...realContext.heroBanners.map(b => ({ id: `heroBanner_${b._id}`, sectionType: 'heroBanner', title: b.title || 'Hero Banner' })),
                ...realContext.thirdBanners.map(b => ({ id: `thirdBanner_${b._id}`, sectionType: 'thirdBanner', title: b.title || 'Third Banner' })),
                ...realContext.productGrids.map(b => ({ id: `productGrid_${b._id}`, sectionType: 'productGrid', title: b.title || 'Product Grid' })),
                ...realContext.categoryGrids.map(b => ({ id: `categoryGrid_${b._id}`, sectionType: 'categoryGrid', title: b.title || 'Category Grid' })),
                { id: 'reviews', sectionType: 'reviews', title: 'Customer Reviews' },
                { id: 'footer', sectionType: 'footer', title: 'Footer' }
            ];

            let reconciled = [];
            let usedIds = new Set();
            
            // Map existing saved sections
            draftSections.forEach(ds => {
                // If it's an old legacy id like 'heroBanner', map it to the first available if any, or just keep it
                // Better: match exact id, fallback to sectionType if it's the old layout format
                let match = allBlocks.find(ab => ab.id === ds.id);
                if (!match && !ds.id.includes('_')) {
                    // Try to match legacy id to the first unused block of that type
                    match = allBlocks.find(ab => ab.sectionType === ds.id && !usedIds.has(ab.id));
                }

                if (match) {
                    reconciled.push({ ...ds, id: match.id, sectionType: match.sectionType, title: match.title });
                    usedIds.add(match.id);
                } else if (!ds.id.includes('_')) {
                    // It's a static block like navbar or footer that wasn't found (should be impossible, but keep it)
                    reconciled.push(ds);
                    usedIds.add(ds.id);
                }
            });

            // Append new blocks not in DB layout yet
            allBlocks.forEach(ab => {
                if (!usedIds.has(ab.id)) {
                    reconciled.push({ ...ab, visible: false, order: reconciled.length + 1 });
                }
            });

            // Make sure the order is sequential
            reconciled = reconciled.map((item, index) => ({ ...item, order: index + 1 }));

            dispatch(updateDraftSections(reconciled));
        }
    }, [status, realContext, draftSections, dispatch, blocksLoaded]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = draftSections.findIndex((item) => item.id === active.id);
            const newIndex = draftSections.findIndex((item) => item.id === over.id);
            
            const newOrder = arrayMove(draftSections, oldIndex, newIndex).map((item, index) => ({
                ...item,
                order: index + 1
            }));
            
            dispatch(updateDraftSections(newOrder));
        }
    };

    const handlePublish = async () => {
        try {
            await dispatch(publishLayout(draftSections)).unwrap();
            toast.success('Layout published successfully!');
        } catch (err) {
            toast.error(err || 'Failed to publish layout');
        }
    };

    if (status === 'loading') return <div className="p-8 text-center text-brand-medium">Loading layout...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading layout: {error}</div>;

    const getSectionLabel = (section) => {
        const typeLabels = {
            navbar: '☰ Navbar',
            heroBanner: '🖼️ Hero Banner',
            thirdBanner: '🎨 Third Banner',
            categoryGrid: '🗂️ Category Grid',
            productGrid: '📦 Product Grid',
            footer: '📋 Footer'
        };
        const base = typeLabels[section.sectionType || section.id] || section.sectionType;
        return section.title && section.title !== section.sectionType ? `${base} - ${section.title}` : base;
    };
    

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[80vh]">
            {/* Left Side: Builder */}
            <div className="w-full lg:w-[350px] flex flex-col bg-white p-5 rounded-2xl border border-[#E6DFD4] shadow-sm">
                <h3 className="text-lg font-bold text-brand-dark mb-4">Layout Builder</h3>
                <p className="text-xs text-brand-medium mb-4">Drag and drop to reorder. Toggle visibility for the customer website.</p>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={draftSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {draftSections.map((section) => (
                                <SortableItem key={section.id} id={section.id} visible={section.visible} label={getSectionLabel(section)} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E6DFD4]">
                    <button onClick={() => toast.success('Draft saved locally')} className="flex-1 px-4 py-2.5 bg-[#FDFCFB] border border-[#E6DFD4] text-brand-dark rounded-xl hover:bg-[#F7F3EE] text-sm font-semibold transition-colors">Save Draft</button>
                    <button onClick={handlePublish} className="flex-1 px-4 py-2.5 bg-brand-dark text-white rounded-xl hover:bg-[#7a5234] text-sm font-semibold transition-colors">Publish</button>
                </div>
                <button onClick={() => dispatch(resetDraft())} className="w-full mt-2 px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 text-sm font-semibold border border-red-100 transition-colors">Reset to Published</button>
            </div>

            {/* Right Side: Live Preview */}
            <div className="flex-1 flex flex-col bg-[#FDF9F1] rounded-2xl border border-[#E6DFD4] overflow-hidden relative shadow-inner">
                <PreviewPanel 
                    draftSections={draftSections} 
                    dummyContext={realContext || {}} 
                    mode={previewMode} 
                    setMode={setPreviewMode}
                >
                    {draftSections.filter(s => s.visible).map(section => (
                        <SectionRenderer key={section.id} section={section} context={realContext || {}} isPreview={true} />
                    ))}
                </PreviewPanel>
            </div>
        </div>
    );
}
