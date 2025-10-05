from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Go to the proxy page where the tunnel UI exists
        page.goto("http://localhost:3000/proxy.html", timeout=10000)

        # Wait for page to be ready
        expect(page.get_by_role("heading", name="Proxy Management")).to_be_visible()

        # --- CREATE ---
        # 2. Open the tunnel management modal
        page.get_by_role("button", name="Manage Tunnels").click()
        page.get_by_role("button", name="Add New Tunnel").click()

        # 3. Fill and submit the form
        expect(page.get_by_role("heading", name="Add New Tunnel")).to_be_visible()
        page.get_by_label("Tunnel Name").fill("My Test Tunnel")
        page.get_by_label("Tunnel Domain").fill("test-tunnel.example.com")
        page.get_by_role("button", name="Save Tunnel").click()

        # 4. Verify the tunnel was created and take a screenshot
        created_tunnel = page.locator(".tunnel-item", has_text="My Test Tunnel")
        expect(created_tunnel).to_be_visible()
        page.screenshot(path="jules-scratch/verification/01_tunnel_created.png")
        print("Successfully created tunnel and took screenshot.")

        # --- UPDATE ---
        # 5. Click the edit button
        created_tunnel.get_by_role("button", name="Edit").click()

        # 6. Update the form
        expect(page.get_by_role("heading", name="Edit Tunnel")).to_be_visible()
        page.get_by_label("Tunnel Name").fill("My Updated Tunnel")
        page.get_by_label("Tunnel Domain").fill("updated-tunnel.example.com")
        page.get_by_role("button", name="Save Tunnel").click()

        # 7. Verify the update and take a screenshot
        updated_tunnel = page.locator(".tunnel-item", has_text="My Updated Tunnel")
        expect(updated_tunnel).to_be_visible()
        expect(created_tunnel).not_to_be_visible()
        page.screenshot(path="jules-scratch/verification/02_tunnel_updated.png")
        print("Successfully updated tunnel and took screenshot.")

        # --- DELETE ---
        # 8. Set up a handler for the confirmation dialog
        page.on("dialog", lambda dialog: dialog.accept())

        # 9. Click the delete button
        updated_tunnel.get_by_role("button", name="Delete").click()

        # 10. Verify the tunnel is gone and take a screenshot
        expect(updated_tunnel).not_to_be_visible()
        # Give a moment for the UI to update fully before the final screenshot
        time.sleep(1)
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Successfully deleted tunnel and took final screenshot.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        print("An error screenshot was taken.")
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)