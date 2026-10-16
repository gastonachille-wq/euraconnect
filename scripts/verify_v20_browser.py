from pathlib import Path
import http.server,socketserver,threading
from playwright.sync_api import sync_playwright
root=Path(__file__).parents[1]/'dist'
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(root),**k)
 def log_message(self,*a):pass
with socketserver.TCPServer(('127.0.0.1',0),Handler) as srv:
 threading.Thread(target=srv.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{srv.server_address[1]}/?demo=1'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for role in ['startup_manager','incube']:
   page=browser.new_page(viewport={'width':1440,'height':900})
   errors=[]
   page.on('pageerror',lambda err: errors.append(str(err)))
   page.goto(url,wait_until='domcontentloaded')
   page.locator('#demo-role').select_option(role)
   if role=='startup_manager':page.goto(url+'#portfolio',wait_until='domcontentloaded')
   else:page.goto(url+'#dashboard',wait_until='domcontentloaded')
   page.wait_for_timeout(1300)
   page.screenshot(path=str(root.parent/f'V20_{role}_desktop.png'),full_page=True)
   print(role,'title',page.title(),'head',page.locator('h1').all_text_contents()[:3],'errors',errors[:3], 'recommend forms',page.locator('#ec20-recommend-form').count())
   page.close()
  page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  page.goto(url,wait_until='domcontentloaded');page.locator('#demo-role').select_option('startup_manager');page.goto(url+'#portfolio');page.wait_for_timeout(900)
  page.screenshot(path=str(root.parent/'V20_manager_mobile.png'),full_page=True)
  print('mobile scrollWidth',page.evaluate('document.documentElement.scrollWidth'),'innerWidth',page.evaluate('innerWidth'))
  browser.close()
