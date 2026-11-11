import { useContext } from 'react';
import { ToastContext } from '../components/toast/toastContext';

function useToast() {
    return useContext(ToastContext);
}

export default useToast;
