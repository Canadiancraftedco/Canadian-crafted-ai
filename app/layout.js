import './globals.css';

export const metadata = {
  title: 'Canadian Crafted Co. | AI-Powered Canadian Outdoor Marketplace',
  description: 'Discover premium Canadian outdoor, health, family, and fitness products — found and vetted by an AI discovery agent.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="topo-bg">
        <div className="container">
          <nav>
            <div className="wordmark">
              Canadian Crafted <span className="leaf">Co.</span>
            </div>
            <div className="nav-links">
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
      </body>
    </html>
  );
}
