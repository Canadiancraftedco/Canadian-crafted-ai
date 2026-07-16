import './globals.css';
import { Space_Grotesk, Inter } from 'next/font/google';
import SmoothScroll from '@/components/SmoothScroll';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' });

export const metadata = {
  title: 'Canadian Crafted Co. | AI-Powered Canadian Outdoor Marketplace',
  description: 'Discover premium Canadian outdoor, health, family, and fitness products — found and vetted by an AI discovery agent.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="topo-bg">
        <SmoothScroll>
          <div className="container">
            <nav>
              <div className="wordmark">
                Canadian Crafted <span className="leaf">Co.</span>
              </div>
              <div className="nav-links">
                <a href="/trip-planner">Trip Planner</a>
                <a href="/outdoors">Outdoors</a>
                <a href="/health">Health</a>
                <a href="/family">Family</a>
                <a href="/fitness">Fitness</a>
              </div>
            </nav>
          </div>
          {children}
          <div className="container">
            <footer>
              Canadian Crafted Co. — products discovered and verified by an AI agent. Always Canadian-first.
            </footer>
          </div>
        </SmoothScroll>
      </body>
    </html>
  );
}
