# Flicky PDF Toolkit 📄✨

Flicky PDF Toolkit is a responsive, highly polished, client-side PDF utility application. It provides quick and secure tools to split, merge, organize, and inspect PDF files directly in your web browser.

---

## 🚀 How to Host on GitHub Pages

This project is fully pre-configured to build and deploy automatically to **GitHub Pages** using **GitHub Actions**.

### Step 1: Create a GitHub Repository
1. Log in to your GitHub account.
2. Create a new repository (e.g., named `flicky-pdf-toolkit`). Keep it **Public** so you can use GitHub Pages for free.
3. Do **not** initialize it with a README, `.gitignore`, or License (since this project already includes them).

### Step 2: Push your Code to GitHub
Open your terminal inside the project directory and run the following commands:
```bash
# Initialize a git repository if you haven't already
git init

# Add all files to staging
git add .

# Create your first commit
git commit -m "Initialize Flicky PDF and set up GitHub Pages deployment"

# Rename the branch to main (if it is not already)
git branch -M main

# Link your local repository to the GitHub repository
# (Replace USERNAME and REPO-NAME with your GitHub details)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Push your code to the GitHub main branch
git push -u origin main
```

### Step 3: Configure GitHub Pages Settings
To allow the automated GitHub Actions workflow to publish your site:
1. Navigate to your repository page on GitHub.
2. Click on the **Settings** tab (the gear icon on the top menu bar).
3. In the left-hand sidebar, scroll down to the **Code and automation** section and click on **Pages**.
4. Under **Build and deployment** -> **Source**, select **GitHub Actions** from the dropdown menu (instead of "Deploy from a branch").

### Step 4: Watch it Deploy!
* As soon as you push your code to `main` and set the source to **GitHub Actions**, GitHub will automatically trigger the workflow we created in `.github/workflows/deploy.yml`.
* You can monitor the progress by clicking the **Actions** tab in your GitHub repository.
* Once the deployment is complete, your live website URL will be displayed in the logs (typically at `https://<USERNAME>.github.io/<REPO-NAME>/`).

---

## 🛠️ Local Development

If you want to run this project locally on your machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/USERNAME/REPO-NAME.git
   cd REPO-NAME
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
