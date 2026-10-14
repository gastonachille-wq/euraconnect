import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
export const metadata:Metadata={
 title:'EURACONNECT | Entreprises, experts et services',
 description:'La plateforme qui connecte les startups, les prestataires et leurs expertises, avec annuaire, offres et besoins.',
 robots:{index:false,follow:false}
};
export default function RootLayout({children}:{children:ReactNode}){
 return <html lang="fr"><body>{children}</body></html>;
}
