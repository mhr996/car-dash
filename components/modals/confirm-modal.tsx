'use client';
import { Fragment } from 'react';
import { Dialog, Transition, DialogPanel, TransitionChild } from '@headlessui/react';
import IconX from '@/components/icon/icon-x';
import React from 'react';
import { getTranslation } from '@/i18n';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onCancel, onConfirm, confirmLabel, cancelLabel, size = 'sm' }) => {
    const { t } = getTranslation();
    const defaultConfirmLabel = confirmLabel || t('confirm');
    const defaultCancelLabel = cancelLabel || t('cancel');
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onCancel}>
                <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-70" />
                </TransitionChild>
                <div className="fixed inset-0 flex items-center justify-center px-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className={`bg-white dark:bg-black rounded-lg overflow-hidden shadow-md ${sizeClasses[size]} p-6`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-black dark:text-gray-400">{title}</h3>
                                <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="mt-4">
                                <p className="text-gray-700 dark:text-gray-400">{message}</p>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={onCancel} className="btn btn-secondary">
                                    {defaultCancelLabel}
                                </button>
                                <button onClick={onConfirm} className="btn btn-danger">
                                    {defaultConfirmLabel}
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ConfirmModal;
