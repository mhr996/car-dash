"use client";
import React, { useEffect, useState } from "react";
import ContractGenerator from "@/components/contracts/contract-generator";
import { CarContract } from "@/types/contract";

export default function ContractViewPage() {
  const [contract, setContract] = useState<CarContract | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      try {
        const encoded = window.location.hash.slice(1);
        const decoded = decodeURIComponent(atob(encoded));
        setContract(JSON.parse(decoded));
      } catch (e) {
        setContract(null);
      }
    }
  }, []);

  if (!contract) {
    return <div className="p-8 text-center text-gray-500">No contract data found.</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl mx-auto p-4">
        <ContractGenerator contract={contract} />
      </div>
    </div>
  );
}
