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

    useEffect(() => {
        dispatch(fetchLayout());
    }, [dispatch]);

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

    const sectionLabels = {
        navbar: '☰ Navbar',
        heroBanner: '🖼️ Hero Banner',
        thirdBanner: '🎨 Third Banner',
        categoryGrid: '🗂️ Category Grid',
        productGrid: '📦 Product Grid',
        footer: '📋 Footer'
    };

    const dummyContext = {
        heroSlides: [{ bannerImage: '/hero1.jpeg', title: 'Hero Preview\nLive Preview', buttonText: 'Shop Now' }],
        thirdBanners: [{ _id: 'preview-1', title: 'Dual Banner Preview', leftImages: ['/hero2.jpeg'], rightImages: ['/hero3.jpeg'] }],
        productGrids: [{ _id: 'preview-2', title: 'Product Grid Preview', products: [{ _id: 'p1', name: 'Wooden Train', price: 1200 }, { _id: 'p2', name: 'Building Blocks', price: 800 }] }],
        shopCategories: [{ _id: 'c1', title: 'Toddlers', image: '/hero4.jpeg' }, { _id: 'c2', title: 'Educational', image: '/hero1.jpeg' }],
        featuredProducts: [{ _id: 'p3', name: 'Best Seller', price: 1500 }],
        featuredReviews: [{ quote: "The quality is exceptional.", author: "Sarah M.", rating: 5, user: { name: "Sarah" } }],
        cartCount: 2,
        wishlistCount: 1,
        user: { name: 'Admin' },
        onNavigate: () => {},
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
                                <SortableItem key={section.id} id={section.id} visible={section.visible} label={sectionLabels[section.id] || section.id} />
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
                    dummyContext={dummyContext} 
                    mode={previewMode} 
                    setMode={setPreviewMode}
                >
                    {draftSections.filter(s => s.visible).map(section => (
                        <SectionRenderer key={section.id} section={section} context={dummyContext} isPreview={true} />
                    ))}
                </PreviewPanel>
            </div>
        </div>
    );
}
