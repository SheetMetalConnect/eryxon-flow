import { siteContent } from "../content/site-content";

const Footer = () => {
  const { jointVenture, companies, links, copyright } = siteContent.footer;

  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-700 pb-6">
          {/* Left Side - Joint Venture Info */}
          <div className="text-center md:text-left">
            <p className="text-lg font-semibold text-gray-300">{jointVenture}</p>
            {companies.map((company, index) => (
              <p key={index} className="mt-1">{company}</p>
            ))}
          </div>

          {/* Right Side - Legal Links */}
          <div className="mt-6 md:mt-0">
            <nav className="flex flex-wrap justify-center md:justify-end gap-6">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="hover:text-white transition duration-300"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;