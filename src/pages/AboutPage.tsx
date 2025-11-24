import React from "react";
import {
  CheckCircle,
  Home,
  Smartphone,
  Zap,
  Shield,
  Heart,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
} from "feather-icons-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AboutPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 sm:px-6 py-12">

        {/* HERO SECTION */}
        <section className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Your Perfect <span className="text-primary-600">Boardinghouse</span> Awaits
            </h1>

            <p className="text-lg text-slate-600">
              Home Haven Hub bridges the gap between owners and tenants with verified listings,
              transparent details, and a seamless experience.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* VERIFIED OWNERS */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-center mb-2">
                  <CheckCircle className="text-primary-500 mr-2" />
                  <h3 className="font-semibold">Verified Owners</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Trustworthy listings with verified owner profiles
                </p>
              </div>

              {/* DETAILED LISTINGS */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-center mb-2">
                  <Home className="text-primary-500 mr-2" />
                  <h3 className="font-semibold">Detailed Listings</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Complete with photos, amenities and availability
                </p>
              </div>

              {/* MOBILE FRIENDLY */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-center mb-2">
                  <Smartphone className="text-primary-500 mr-2" />
                  <h3 className="font-semibold">Mobile Friendly</h3>
                </div>
                <p className="text-sm text-slate-500">Optimized for all devices</p>
              </div>

              {/* MODERN TECH */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-center mb-2">
                  <Zap className="text-primary-500 mr-2" />
                  <h3 className="font-semibold">Modern Tech</h3>
                </div>
                <p className="text-sm text-slate-500">Built for speed and reliability</p>
              </div>
            </div>
          </div>

          {/* HERO IMAGE + BADGE */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary-50 to-white p-1 rounded-2xl shadow-xl">
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                <img
                  src="http://static.photos/housing/1024x576/42"
                  alt="Modern housing"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-800">Our Vision</h3>
                <p className="text-slate-600 mt-2">
                  To revolutionize boardinghouse rentals by creating meaningful connections
                  between owners and tenants through technology.
                </p>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 bg-secondary-500 text-white px-4 py-2 rounded-lg shadow-lg">
              <span className="font-medium">Trusted by 500+ owners</span>
            </div>
          </div>
        </section>

        {/* VALUES SECTION */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Our Core Values</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              These principles guide everything we do at Home Haven Hub
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* TRUST */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trust & Transparency</h3>
              <p className="text-slate-600">
                We verify all listings and encourage open communication.
              </p>
            </div>

            {/* COMMUNITY */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community Focus</h3>
              <p className="text-slate-600">
                Building relationships that create lasting housing solutions.
              </p>
            </div>

            {/* GROWTH */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Continuous Improvement</h3>
              <p className="text-slate-600">
                We constantly evolve based on user feedback.
              </p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl px-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Home?</h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-8">
            Join thousands of satisfied tenants and owners who've found their perfect match through Home Haven Hub.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth"
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all"
            >
              List Your Property
            </a>
            <a
              href="/listings"
              className="bg-transparent border-2 border-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:bg-opacity-10 transition-all"
            >
              Browse Listings
            </a>
          </div>
        </section>

        {/* TEAM SECTION */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Meet Our Team</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The passionate people behind Home Haven Hub
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={`http://static.photos/people/400x400/${n}`}
                  alt="Team member"
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold">Member {n}</h3>
                  <p className="text-sm text-slate-500">Team Role</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="py-16">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* CONTACT INFO */}
              <div className="p-8 md:p-12">
                <h2 className="text-2xl font-bold mb-4">Get In Touch</h2>
                <p className="text-slate-600 mb-6">
                  Have questions or want to partner with us? We'd love to hear from you.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <Mail className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Email Us</h3>
                      <a
                        href="mailto:hello@homehavenhub.example"
                        className="text-primary-600 hover:underline"
                      >
                        hello@homehavenhub.example
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <Phone className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Call Us</h3>
                      <a
                        href="tel:+639123456789"
                        className="text-primary-600 hover:underline"
                      >
                        +63 912 345 6789
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <MapPin className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Visit Us</h3>
                      <p className="text-slate-600">
                        123 Housing St, Metro City, Philippines
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTACT FORM */}
              <div className="bg-slate-50 p-8 md:p-12">
                <h3 className="text-xl font-semibold mb-4">Send us a message</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-all"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
