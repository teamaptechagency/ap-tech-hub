'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Icon } from './elements';
import './workspace-login.css';

export function WorkspaceLogin({ admin = false, register = false, busy, error, onSubmit, onToggleRegister }) {
  const [showPassword, setShowPassword] = useState(false);
  const title = register ? 'Create your account.' : 'Welcome back.';
  return <main id="main" className="workspace-login">
    <aside className="workspace-login-art">
      <Link className="workspace-login-logo" href="https://wpnazmul.com/" aria-label="Nazmul H. — Homepage">Nazmul H.</Link>
      <div className="workspace-login-story">
        <p className="workspace-login-kicker">A space to bring it together</p>
        <h2>Good work.<br/><span>All together.</span></h2>
        <p>Your projects, your people, your next idea.<br/>One workspace to keep things moving.</p>
        <div className="workspace-login-preview" aria-hidden="true">
          <div className="workspace-login-preview-head"><span>NH</span><strong>Your workspace</strong></div>
          <div className="workspace-login-preview-body">
            <strong>Make room for good work.</strong>
            <div className="workspace-login-preview-links"><span><Icon name="folder"/> Projects</span><span><Icon name="chat"/> Messages</span><span><Icon name="globe"/> Website</span></div>
            <p>A new website, taking shape.</p>
            <div className="workspace-login-track"/>
          </div>
          <div className="workspace-login-preview-note"><Icon name="chat"/> Every message, in one place.</div>
        </div>
      </div>
      <p className="workspace-login-credit"><Icon name="spark"/> Thoughtfully built. Personally managed.</p>
    </aside>
    <div className="workspace-login-side">
      <header><span className="workspace-login-kicker">{admin ? 'Admin workspace' : 'Client workspace'}</span><Link href="https://wpnazmul.com/"><Icon name="globe"/> View website</Link></header>
      <div className="workspace-login-content">
        <span className="workspace-login-lock"><LockKeyhole size={19} aria-hidden="true"/></span>
        <p className="workspace-login-kicker">Your workspace awaits</p>
        <h1>{title}</h1>
        <p>{register ? 'Create a workspace for your projects.' : admin ? 'Sign in to manage your projects and enquiries.' : 'Sign in to view your projects, messages and files.'}</p>
        <form className="workspace-login-form" onSubmit={onSubmit} aria-busy={busy}>
          {register && <label>Name<input name="name" autoComplete="name" required/></label>}
          <label>Email address<span className="workspace-login-field"><Mail size={16} aria-hidden="true"/><input name="email" type="email" autoComplete="username" placeholder="you@example.com" required/></span></label>
          <div>
            <div className="workspace-login-label"><label htmlFor="workspace-password">Password</label>{!register && <a href="mailto:hello@wpnazmul.com?subject=Password%20help">Forgot password?</a>}</div>
            <div className="workspace-login-field"><LockKeyhole size={16} aria-hidden="true"/>
              <input id="workspace-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder="Enter your password" required/>
              <button type="button" aria-controls="workspace-password" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>
          {register && <label>Confirm password<input name="password_confirmation" type="password" autoComplete="new-password" required/></label>}
          {error && <p className="workspace-login-error" role="alert">{error}</p>}
          <button className="btn workspace-login-submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<LockKeyhole size={15} aria-hidden="true"/></button>
        </form>
        {!admin && <button type="button" className="link-btn workspace-login-switch" disabled={busy} onClick={() => { setShowPassword(false); onToggleRegister(); }}>{register ? 'Return to sign in' : 'Create a client account'}</button>}
      </div>
      <footer><span>© 2026 Nazmul Hasan</span>{admin && <Link href="/client">Looking for the client portal?</Link>}</footer>
    </div>
  </main>;
}
