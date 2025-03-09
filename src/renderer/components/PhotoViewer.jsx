import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

const PhotoViewer = ({ isOpen, onClose, type = 'images' }) => {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handlePrevious = useCallback(() => {
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    }, [images.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowLeft':
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case 'Escape':
                    onClose();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handlePrevious, handleNext, onClose]);

    useEffect(() => {
        const loadImages = async () => {
            try {
                setLoading(true);
                setError(null);
                const directory = type === 'images' ? '~/.npcsh/images' : '~/.npcsh/screenshots';

                // Ensure directory exists
                await window.api.ensureDirectory(directory);

                // Load images
                const response = await window.api.readDirectoryImages(directory);
                if (response && Array.isArray(response)) {
                    setImages(response);
                    setCurrentIndex(0); // Reset to first image when loading new directory
                }
            } catch (err) {
                console.error('Error loading images:', err);
                setError('Failed to load images: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadImages();
        }
    }, [isOpen, type]);

    // Reset state when closing
    useEffect(() => {
        if (!isOpen) {
            setCurrentIndex(0);
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentImage = images[currentIndex];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10"
            >
                <X size={24} />
            </button>

            {/* Main content area */}
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
                {/* Navigation buttons */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10"
                        >
                            <ChevronLeft size={32} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10"
                        >
                            <ChevronRight size={32} />
                        </button>
                    </>
                )}

                {/* Image display area */}
                <div className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 text-white">
                            <Loader className="animate-spin" size={32} />
                            <span>Loading images...</span>
                        </div>
                    ) : error ? (
                        <div className="text-white text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : images.length > 0 ? (
                        <div className="relative">
                            <img
                                src={currentImage} // The URL already includes the local-file:// protocol
                                alt={`${type} ${currentIndex + 1}`}
                                className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
                            />

                            <div className="absolute bottom-0 left-0 right-0 text-center text-white bg-black/50 py-2 rounded-b">
                                {currentIndex + 1} / {images.length}
                            </div>
                        </div>
                    ) : (
                        <div className="text-white text-center">
                            <p className="mb-4">No images found in {type} directory</p>
                            <p className="text-sm text-gray-400 mb-4">
                                Directory: ~/.npcsh/{type}
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {images.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 overflow-x-auto">
                        <div className="flex gap-2 justify-center pb-2">
                            {images.map((image, index) => (
                                <button
                                    key={image}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all
                                        ${index === currentIndex
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
                                            : 'opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img
                                        src={image} // The URL already includes the local-file:// protocol
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoViewer;