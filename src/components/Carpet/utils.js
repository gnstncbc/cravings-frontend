import { toast } from 'react-toastify';

export const downloadImage = (base64, fileName) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`"${fileName}" indirildi.`);
};