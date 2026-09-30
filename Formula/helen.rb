class Helen < Formula
  desc "Autonomous engineering system with playbooks, skills, and tools catalog"
  homepage "https://github.com/eneekoruiz/helen"
  url "https://registry.npmjs.org/helen-cli/-/helen-cli-2.1.0.tgz"
  license "MIT"

  depends_on "node@20"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/helen", "--version"
  end
end
