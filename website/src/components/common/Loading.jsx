import React from 'react';

const Loading = ({ message = 'Loading...', fullScreen = false }) => {
    const content = (
        <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            {message && <p className="mt-4 text-gray-600">{message}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return <div className="flex items-center justify-center py-12">{content}</div>;
};

export default Loading;

