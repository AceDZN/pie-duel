/** After startLevel: click through the booth subject card and versus banner until the goal card is up. */
export async function toGoal(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.isVisible('#goal-go')) return;
    if (await page.isVisible('#booth-go')) await page.click('#booth-go');
    else if (await page.isVisible('#versus')) await page.click('#versus');
    await page.evaluate(() => window.advanceTime(150));
  }
}
