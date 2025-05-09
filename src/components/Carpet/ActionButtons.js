import React from 'react';

function ActionButtons({
    onSharePitches,
    onClearPitch,
    onSaveMatch,
    isSharing,
    isSavingMatch,
    hasPlayersOnPitch
}) {
    return (
        <>
            <button
                onClick={onSharePitches}
                className='w-full bg-purple-600 hover:bg-purple-700 py-2.5 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-60'
                disabled={isSharing || !hasPlayersOnPitch}
                title={!hasPlayersOnPitch ? "Paylaşmak için sahada oyuncu olmalı" : "Her iki kadroyu da paylaş"}
            >
                {isSharing ? 'Hazırlanıyor...' : 'Kadroları Resim Olarak Paylaş'}
            </button>
            <button
                onClick={onClearPitch}
                className='w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50'
                disabled={isSharing}
            >
                Mevcut Sahayı Temizle
            </button>
            <button
                onClick={onSaveMatch}
                className='w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50'
                disabled={isSavingMatch || isSharing}
            >
                {isSavingMatch ? 'Kaydediliyor...' : 'Mevcut Dizilişi Kaydet'}
            </button>
        </>
    );
}

export default ActionButtons;