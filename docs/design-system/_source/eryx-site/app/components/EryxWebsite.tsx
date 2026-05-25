"use client"; // If you plan to use client-side only features like useState, remove if strictly server-side.

import React from 'react';
import { ArrowRight, Box, Database, BrainCircuit, MapPin, Clock, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { siteContent } from '../content/site-content';
import Footer from "../components/Footer"; 

/**
 * Maps each tier name to the correct Tailwind classes.
 * This avoids dynamic class issues and ensures colors are recognized by Tailwind.
 */
function getTierClasses(tierName: string) {
  switch (tierName.toLowerCase()) {
    case "bronze":
      return {
        border: "border-bronze",
        text: "text-bronze",
        bg: "bg-bronze",
      };
    case "silver":
      return {
        border: "border-silver",
        text: "text-silver",
        bg: "bg-silver",
      };
    case "gold":
      return {
        border: "border-gold",
        text: "text-gold",
        bg: "bg-gold",
      };
    default:
      return {
        border: "border-gray-300",
        text: "text-gray-600",
        bg: "bg-gray-200",
      };
  }
}

/**
 * Main Eryx Website Layout
 * Includes:
 * - Hero Section
 * - What Is ERYX
 * - Who Is ERYX
 * - EU Presence
 * - Technology
 * - Service Tiers (Pricing)
 * - Call To Action
 * - Footer
 */
const EryxWebsite = () => {
  // Destructure content from siteContent
  const { hero, whatIsEryx, whoIsEryx, serviceTiers, technology, cta, euPresence } = siteContent;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/** =================== Hero Section =================== */}
      <header className="relative py-32 text-center">
        <h1 className="text-6xl font-bold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          {hero.title}
        </h1>
        <p className="text-2xl mb-12 text-gray-600 leading-relaxed max-w-3xl mx-auto">
          {hero.subtitle}
        </p>

        {/* Calls To Action (Primary + Secondary) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="animated-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg flex items-center text-lg font-semibold">
            {hero.cta}
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
          <button className="text-gray-600 hover:text-blue-600 px-8 py-4 rounded-lg flex items-center text-lg font-semibold transition-colors duration-300">
            Schedule Demo
          </button>
        </div>
      </header>

      {/** =================== What Is ERYX =================== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">{whatIsEryx.title}</h2>
          
          {/* Cards showing ERYX attributes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whatIsEryx.cards.map((card, index) => {
              // Cycle through icons
              const icons = [Box, Database, BrainCircuit];
              const Icon = icons[index];

              return (
                <div
                  key={index}
                  className="hover-lift bg-white p-8 rounded-xl shadow-md text-center"
                >
                  <div className="bg-blue-100 p-4 rounded-full flex justify-center mb-6">
                    <Icon size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-blue-600">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/** =================== Who Is ERYX =================== */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">{whoIsEryx.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {whoIsEryx.team.map((member, index) => (
              <div
                key={index}
                className="hover-shadow bg-white p-8 rounded-xl shadow-md text-center"
              >
                <div className="flex items-center justify-center mb-6">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={112}
                    height={112}
                    className="rounded-full shadow-lg border-2 border-blue-100"
                  />
                </div>
                <h3 className="text-2xl font-bold text-blue-600">{member.name}</h3>
                <p className="text-gray-600 text-lg">{member.role}</p>
                <p className="text-gray-600 mt-4">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/** =================== EU Presence =================== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">{euPresence.title}</h2>
          <p className="text-xl text-gray-600 mb-12">{euPresence.subtitle}</p>

          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {euPresence.locations.map((location, index) => (
              <div key={index} className="hover-shadow bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-2xl font-bold text-blue-600">{location.title}</h3>
                <p className="text-gray-600 text-lg">{location.description}</p>
              </div>
            ))}
          </div>

          {/* Benefits within the EU */}
          <div className="mt-12 p-6 bg-blue-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {euPresence.benefits.map((benefit, index) => {
                let Icon = MapPin;
                if (index === 1) Icon = Clock;
                if (index === 2) Icon = MessageCircle;

                return (
                  <div key={index} className="flex items-center gap-4">
                    <Icon className="text-blue-600 w-6 h-6" />
                    <div>
                      <h4 className="font-bold text-lg">{benefit.title}</h4>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/** =================== Technology =================== */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">{technology.title}</h2>
          <h3 className="text-2xl text-blue-600 font-semibold mb-6">{technology.subtitle}</h3>
          <p className="text-gray-600 text-lg mb-8">{technology.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {technology.features.map((feature, index) => (
              <div key={index} className="hover-shadow bg-white p-6 rounded-xl shadow-md">
                <h4 className="text-xl font-bold text-blue-600 mb-3">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/** =================== Service Tiers =================== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">{serviceTiers.title}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {serviceTiers.tiers.map((tier, index) => {
              // Use the helper to map tier name -> actual classes
              const tierClasses = getTierClasses(tier.name);

              return (
                <div
                  key={index}
                  className={`service-card bg-white p-8 rounded-xl shadow-md border-t-4 ${tierClasses.border}`}
                >
                  {/* Tier Name */}
                  <h3 className={`text-2xl font-semibold mb-2 ${tierClasses.text}`}>
                    {tier.name}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-gray-600 mb-3 text-md">{tier.subtitle}</p>

                  {/* Price */}
                  <p className="text-lg font-medium text-gray-700 mb-5">{tier.price}</p>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6 text-left">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <ArrowRight className={`${tierClasses.text} flex-shrink-0`} size={16} />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    className={`animated-button w-full ${tierClasses.bg} hover:opacity-90 text-white py-3 rounded-lg font-semibold text-md`}
                  >
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Upgrade Options */}
          <div className="mt-16 bg-white p-8 rounded-xl shadow-md">
            <h3 className="text-2xl font-bold text-blue-600 mb-6">Upgrade Options</h3>
            <p className="text-gray-600 mb-4">
              Enhance your ERYX system with additional services tailored to your needs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {serviceTiers.upgrades.map((upgrade, index) => (
                <div key={index} className="p-6 bg-gray-100 rounded-lg text-center">
                  <h4 className="text-lg font-semibold text-gray-800">{upgrade.title}</h4>
                  <p className="text-gray-600 text-sm mt-2">{upgrade.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/** =================== CTA Section =================== */}
      <section className="py-24 text-center">
        <h2 className="text-4xl font-bold mb-8">{cta.title}</h2>
        <p className="text-xl mb-12 text-gray-600 max-w-3xl mx-auto">{cta.subtitle}</p>
        <button className="animated-button bg-blue-600 text-white px-12 py-5 rounded-lg text-xl font-semibold">
          {cta.buttonText}
        </button>
      </section>

      {/** =================== Footer =================== */}
      <Footer />
    </div>
  );
};

export default EryxWebsite;