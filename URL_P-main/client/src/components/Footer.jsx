export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Phishing Detector - Protecting you from online threats</p>
      <p className="mt-2 text-sm text-gray-500">Stay safe online by verifying URLs before clicking</p>
    </footer>
  );
}