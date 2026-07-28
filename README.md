# Nitos TradeHub Platform

A modern, full-featured marketplace platform built with React, TypeScript, and Firebase. This platform enables users to buy and sell products in a secure and user-friendly environment.

![Nitos TradeHub Platform](public/og-image.png)

## 🌟 Features

### User Management
- Secure authentication with Firebase
- User profile management
- Profile photo support
- Multi-language support (English and Portuguese)

### Product Management
- Create, edit, and delete product listings
- Multiple image upload support
- YouTube video integration
- Product categorization
- Stock management
- Price tracking

### Shopping Experience
- Shopping cart functionality
- Real-time stock updates
- Favorites/wishlist system
- Purchase history tracking
- Secure checkout process

### User Interface
- Responsive design for all devices
- Dark mode support
- Modern and intuitive navigation
- Real-time notifications
- Loading states and error handling

## 🛠️ Tech Stack

- **Frontend Framework**: React with TypeScript
- **State Management**: React Context API
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Internationalization**: i18next
- **UI Components**: Headless UI
- **Icons**: Heroicons
- **Build Tool**: Vite

## 📱 Pages and Features

### Authentication Pages
- **Login Page**: Secure user authentication with email/password
- **Profile Page**: User profile management and settings

### Product Pages
- **Home Page**: Featured products and marketplace overview
- **Product Detail Page**: Detailed product information with image gallery
- **New Product Page**: Product creation with multi-image upload
- **Edit Product Page**: Product information management
- **My Products Page**: User's product listings management

### Shopping Pages
- **Shopping Cart**: Real-time cart management
- **Checkout Page**: Secure payment processing
- **My Purchases**: Purchase history and tracking
- **My Favorites**: Saved products and wishlist

### Navigation
- Responsive navigation bar
- Mobile-friendly menu
- User profile dropdown
- Language switcher
- Cart access

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tradehub.git
cd tradehub/frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a Firebase project and add your configuration:
   - Create a new Firebase project
   - Enable Authentication, Firestore, and Storage
   - Add your Firebase configuration to the project

4. Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Start the development server:
```bash
pnpm dev
```

### Building for Production

1. Generate the Open Graph image:
```bash
pnpm generate-og-image
```

2. Build the project:
```bash
pnpm build
```

3. Preview the production build:
```bash
pnpm preview
```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Set up Firestore Database
4. Configure Storage rules
5. Add your Firebase configuration to the environment variables

### Internationalization
The project supports multiple languages through i18next. Translation files are located in:
- `src/i18n/locales/en.json` (English)
- `src/i18n/locales/pt.json` (Portuguese)

### Social Sharing
The project includes Open Graph meta tags for social media sharing. The configuration is in:
- `index.html` (meta tags)
- `public/og-image.svg` (social sharing image)

## 📦 Project Structure

```
src/
├── assets/          # Static assets
├── i18n/           # Internationalization
├── pages/          # Page components
│   ├── components/ # Reusable components
│   ├── context/    # React Context providers
│   └── utils/      # Utility functions
├── types/          # TypeScript type definitions
└── main.tsx        # Application entry point
```

## 🗄️ Histórico de Deploy / Como Repor o Site no Ar

> **Nota (2026-07-28):** o site estava hospedado em `nitos.purplemethod.pt` (Hostinger, alojamento partilhado, pasta `~/domains/nitos.purplemethod.pt/public_html`). O domínio foi **apagado do Hostinger para liberar espaço**. Nada foi perdido — foi verificado antes de apagar:
>
> - O código-fonte estava 100% sincronizado com este repositório (commit `4ceb7f7`), sem modificações locais no servidor.
> - Os arquivos de build implantados (`index.html`, `web.config`, `_redirects`) tinham checksums MD5 idênticos aos de `frontend/dist/`.
> - Os dados da aplicação (usuários, produtos, compras) vivem no **Firebase/Firestore**, não no Hostinger — apagar o domínio não afeta os dados. As regras estão em `frontend/firestore.rules`.
> - O `.htaccess` implantado era uma versão simplificada; o `frontend/public/.htaccess` deste repositório é um superconjunto (mesmo rewrite de SPA + CORS + cache + `-Indexes`), então republicar a partir do git resulta em configuração igual ou melhor.

### Passos para republicar

1. **Criar o subdomínio** `nitos.purplemethod.pt` no hPanel do Hostinger (Websites → Add Website / Subdomain).
2. **Build local:**
   ```bash
   cd frontend
   npm install   # ou pnpm install
   npm run build # gera frontend/dist/
   ```
3. **Publicar:** copiar o conteúdo de `frontend/dist/` para `~/domains/nitos.purplemethod.pt/public_html/` (via File Manager, FTP ou `scp`). Alternativa usada anteriormente: clonar este repositório dentro do `public_html` e copiar o `dist/` para a raiz.
4. **Verificar** que `.htaccess` foi copiado junto (arquivos ocultos!) — sem ele o roteamento da SPA (React Router) quebra com 404 em refresh.

### Acesso SSH ao Hostinger

Host, porta e usuário estão em `frontend/.env` (**não versionado** — mantenha uma cópia segura fora do repositório, ex. gerenciador de senhas). Conexão por senha; se a chave SSH local pedir passphrase e travar, forçar autenticação por senha:

```bash
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password -p <SSH_PORT> <SSH_USER>@<SSH_HOST>
```

### Avisos

- Ao apagar/recriar o domínio, conferir se há **cron jobs** no hPanel apontando para caminhos do domínio e removê-los/recriá-los.
- Nunca commitar o `frontend/.env` (contém credenciais SSH e token da API do Hostinger).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Headless UI](https://headlessui.dev/)
- [Heroicons](https://heroicons.com/)
- [i18next](https://www.i18next.com/)
