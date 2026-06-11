/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements extends React.JSX.IntrinsicElements { }
    }
}
