export const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes} dakika ${seconds} saniye` : `${seconds} saniye`;
};