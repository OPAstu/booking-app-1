// LoginModal.js
import React, { useState } from 'react';
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword } from "firebase/auth";

const LoginModal = ({ setShowLoginModal, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました。');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>ログイン</h2>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleLogin}>ログイン</button>
        <button onClick={() => setShowLoginModal(false)}>キャンセル</button>
      </div>
    </div>
  );
};

export default LoginModal;
