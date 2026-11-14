"""Local launcher/asset checks; formula and panel tests run in Node."""
from pathlib import Path
import subprocess
import unittest
import render_offline


class EditorTests(unittest.TestCase):
    def test_assets_and_javascript(self):
        for name in ('index.html', 'style.css', 'engine.js', 'app.js', 'zip.js'):
            self.assertTrue((render_offline.EDITOR / name).is_file())
        subprocess.run(['node', str(Path(__file__).with_name('test_panel_editor.js'))], check=True)

    def test_launcher_help(self):
        result = subprocess.run(['python3', str(Path(render_offline.__file__)), '--help'],
                                capture_output=True, text=True, check=True)
        self.assertIn('--no-browser', result.stdout)
        self.assertNotIn('--sketch-start', result.stdout)


if __name__ == '__main__':
    unittest.main()
