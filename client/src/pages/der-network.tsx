import { FormEvent, useState } from "react";
import { Link } from "wouter";
import "./landing.css";

export default function DerNetworkPage() {
  const [submitted,setSubmitted]=useState(false);
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setSubmitted(true);};
  return <div className="landing-page"><header><div className="header-inner"><Link href="/" className="brand"><span className="brand-name">EcoXchange</span><span className="brand-tag">DER Network</span></Link><nav><Link href="/">For Data Centers</Link><Link href="/faq">FAQ</Link></nav></div></header>
  <main><section className="hero"><div className="hero-text"><div className="label hero-eyebrow">Early access · Homes · Small businesses · Community assets</div><h1 className="hero-headline">Put your energy assets to work<br/><em>when the local grid needs flexibility.</em></h1><p className="hero-sub">Join the early-access network for batteries, EV charging, solar, smart thermostats, electric water heating, and other flexible energy assets. When an eligible local program becomes available, EcoXchange may connect participating assets to approved grid-services or flexibility opportunities.</p></div></section>
  <section className="problem"><div className="section-header"><span className="label section-num">Early access</span><h2 className="section-title">Check your future eligibility.</h2></div>
  {submitted ? <div className="network-success"><h3>You’re on the early-access list.</h3><p>We’ll use your location and asset information to determine whether an EcoXchange or partner program becomes available in your area. No enrollment or compensation is guaranteed.</p></div> :
  <form className="network-form" onSubmit={submit}>
    <label>ZIP code<input name="zip" inputMode="numeric" required /></label>
    <label>Electric utility<input name="utility" placeholder="Utility name or Not sure" required /></label>
    <label>Property type<select name="propertyType" required><option value="">Select</option><option>Single-family home</option><option>Multifamily</option><option>Small business</option><option>Nonprofit / community</option><option>Municipal</option><option>Other</option></select></label>
    <fieldset><legend>Which assets do you have?</legend>{["Battery","Solar","EV / EV charger","Smart thermostat / controllable HVAC","Electric water heater","Other flexible electric equipment"].map(x=><label className="check" key={x}><input type="checkbox" name="assets" value={x}/>{x}</label>)}</fieldset>
    <label>Battery / flexible asset size, if known<input name="assetSize" placeholder="e.g. 13.5 kWh battery, 11 kW EV charger" /></label>
    <label>Would you allow an approved program to adjust eligible equipment for short periods with defined protections?<select name="dispatchIntent" required><option value="">Select</option><option>Yes</option><option>Maybe</option><option>No</option></select></label>
    <label>Would you consider financed DER equipment if the economics work?<select name="financedDer" required><option value="">Select</option><option>Yes</option><option>Maybe</option><option>No</option></select></label>
    <label>Email<input type="email" name="email" required /></label>
    <label className="check"><input type="checkbox" required />I agree EcoXchange may contact me about DER pilots, eligibility, and partner programs. Joining this list does not guarantee program eligibility, compensation, or enrollment.</label>
    <button className="btn btn-primary" type="submit">Join early access</button>
  </form>}
  <p className="problem-intro network-note">EcoXchange uses this information to understand geographic DER availability. Joining the network does not mean your home or asset directly supplies a nearby data center. Eligible resources may provide grid-side flexibility through approved utility or market programs.</p>
  </section></main></div>;
}
