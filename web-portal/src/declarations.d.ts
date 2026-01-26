declare module 'react-leaflet-draw' {
    import { FeatureGroup } from 'leaflet';
    import { ReactNode } from 'react';

    export interface EditControlProps {
        position?: string;
        onCreated?: (e: any) => void;
        onEdited?: (e: any) => void;
        onDeleted?: (e: any) => void;
        draw?: any;
    }

    export class EditControl extends React.Component<EditControlProps> { }
}
