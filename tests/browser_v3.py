from pathlib import Path
src=Path('tests/browser_smoke.py').read_text()
exec(src.split('try: asyncio.run(main())')[0])
async def extra():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   page=await open_page(browser,width=width,height=900,role='incube')
   for target in ['dashboard','company','company?tab=company','company?tab=team','company?tab=security','messages','agenda','offers','needs']:
    await route(page,'#'+target)
    await ok(str(width)+': '+target+' no page overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    if target in ['dashboard','messages','agenda','offers','company']:
     await page.screenshot(path=str(OUT/(str(width)+'-'+target+'.png')),full_page=True)
   await route(page,'#company')
   await page.locator('.v3-account-menu>summary').click()
   await ok(str(width)+': account menu opens',await page.locator('.v3-account-menu nav').is_visible())
   await page.keyboard.press('Escape')
   await ok(str(width)+': Escape closes account menu',not await page.locator('.v3-account-menu nav').is_visible())
   await page.locator('.v3-profile-tabs [href="#company?tab=security"]').click();await ready(page)
   await ok(str(width)+': security tab exposes password action',await page.locator('[data-action=change-password]').is_visible())
   await page.locator('.v3-account-menu>summary').click()
   await page.locator('[data-action=logout-confirm]').click()
   await ok(str(width)+': logout confirmation opens',await page.locator('.modal').is_visible())
   await page.locator('.modal [data-action=close-modal]').last.click()
   await ok(str(width)+': cancel logout preserves current view',await page.locator('.modal').count()==0 and await page.locator('[data-action=change-password]').is_visible())
   await route(page,'#messages')
   if width>800:
    before=await page.locator('.v3-messages>.conversation').bounding_box()
    await page.locator('.v3-thread-context>summary').click()
    after=await page.locator('.v3-messages>.conversation').bounding_box()
    await ok('Context collapse expands the chat',after['width']>before['width'])
   await ok(str(width)+': no JS runtime error',not page._ec_errors)
   await page.close()
  await browser.close()
 OUT.joinpath('rapport-v3.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))
 print(json.dumps({'passed':sum(x['passed'] for x in RESULTS),'total':len(RESULTS)}))
asyncio.run(extra())
