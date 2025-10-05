import subprocess
import time
from playwright.sync_api import sync_playwright, expect
import os

def run_verification():
    server_process = None
    try:
        # --- Start Server ---
        print("Starting Vercel development server with npx...")
        # Use npx to ensure the local vercel CLI is found.
        # Start the server as a background process.
        server_process = subprocess.Popen(
            ["npx", "vercel", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid # To kill the process and its children later
        )

        # Wait for the server to be ready.
        # We'll poll for a few seconds to see if the server starts listening.
        time.sleep(15) # Increased wait time for server to boot

        # Check if the process has already exited with an error
        if server_process.poll() is not None:
             stdout, stderr = server_process.communicate()
             print(f"Server failed to start. Exit code: {server_process.returncode}")
             print(f"STDOUT: {stdout}")
             print(f"STDERR: {stderr}")
             raise RuntimeError("Vercel server failed to start.")

        print("Server started. Running Playwright tests...")

        # --- Run Playwright Tests ---
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # 1. Go to the proxy page
            page.goto("http://localhost:3000/proxy.html", timeout=20000)
            expect(page.get_by_role("heading", name="Proxy Management")).to_be_visible()

            # 2. CREATE
            page.get_by_role("button", name="Manage Tunnels").click()
            page.get_by_role("button", name="Add New Tunnel").click()
            page.get_by_label("Tunnel Name").fill("My Test Tunnel")
            page.get_by_label("Tunnel Domain").fill("test-tunnel.example.com")
            page.get_by_role("button", name="Save Tunnel").click()
            created_tunnel = page.locator(".tunnel-item", has_text="My Test Tunnel")
            expect(created_tunnel).to_be_visible()
            page.screenshot(path="jules-scratch/verification/01_tunnel_created.png")

            # 3. UPDATE
            created_tunnel.get_by_role("button", name="Edit").click()
            page.get_by_label("Tunnel Name").fill("My Updated Tunnel")
            page.get_by_role("button", name="Save Tunnel").click()
            updated_tunnel = page.locator(".tunnel-item", has_text="My Updated Tunnel")
            expect(updated_tunnel).to_be_visible()
            page.screenshot(path="jules-scratch/verification/02_tunnel_updated.png")

            # 4. DELETE
            page.on("dialog", lambda dialog: dialog.accept())
            updated_tunnel.get_by_role("button", name="Delete").click()
            expect(updated_tunnel).not_to_be_visible()
            page.screenshot(path="jules-scratch/verification/verification.png")

            print("All tests passed and screenshots taken.")
            browser.close()

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        raise
    finally:
        # --- Stop Server ---
        if server_process:
            print("Shutting down server...")
            os.killpg(os.getpgid(server_process.pid), 9) # Kill the process group
            stdout, stderr = server_process.communicate()
            print("Server shut down.")
            # print(f"Server stdout:\n{stdout}")
            # print(f"Server stderr:\n{stderr}")


if __name__ == "__main__":
    run_verification()