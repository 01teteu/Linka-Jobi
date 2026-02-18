
import React, { useState } from 'react';
import { Star, X, ShieldCheck } from 'lucide-react';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    professionalName: string;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSubmit, professionalName }) => {
    const [rating, setRating] = useState(5);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-primaryContainer rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                        <Star className="w-10 h-10 text-primary fill-primary" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-textMain mb-2 leading-tight">Avalie o Vizinho</h2>
                    <p className="text-textMuted text-sm mb-10 font-medium">Como foi o serviço com <span className="text-primary font-bold">{professionalName}</span>?</p>

                    <div className="flex justify-center gap-2 mb-10">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="transition-transform active:scale-90"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                            >
                                <Star 
                                    className={`w-10 h-10 ${
                                        star <= (hover || rating) 
                                        ? 'text-yellow-400 fill-yellow-400' 
                                        : 'text-gray-100 fill-gray-100'
                                    } transition-colors`} 
                                />
                            </button>
                        ))}
                    </div>

                    <div className="relative mb-8">
                        <textarea
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 text-sm text-textMain focus:border-primary outline-none min-h-[120px] transition-all font-medium"
                            placeholder="Escreva algo legal sobre o serviço..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-10 flex items-start gap-3 text-left">
                        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-[11px] text-blue-700 font-bold leading-relaxed">Sua avaliação é pública e ajuda outros vizinhos a encontrarem bons profissionais.</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => onSubmit(rating, comment)}
                            className="w-full bg-primary text-white font-black py-5 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all"
                        >
                            Enviar Avaliação
                        </button>
                        <button onClick={onClose} className="w-full text-textMuted font-bold py-2 text-sm">Agora não</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
