import { BrowserProvider, Contract, type InterfaceAbi } from "ethers";
import { withReadProvider } from "./hoodi";

/** CertiChain, deployed on the Hoodi testnet. Reads go through public RPC
 *  nodes (no wallet needed); writes are signed by the user's MetaMask. */

export const CONTRACT_ADDRESS = "0x403CA62038c83D4Bd7952Ce69848E43765B90997";

export const CERT_ABI: InterfaceAbi = [
  {
    inputs: [
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "string", name: "_certificate_id", type: "string" },
      { internalType: "string", name: "_course_name", type: "string" },
      { internalType: "string", name: "_issue_date", type: "string" },
    ],
    name: "issue_cert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "", type: "string" }],
    name: "certificates",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "certificate_id", type: "string" },
      { internalType: "string", name: "course_name", type: "string" },
      { internalType: "string", name: "issue_date", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export type Certificate = {
  name: string;
  certificateId: string;
  courseName: string;
  issueDate: string;
};

/** Looks a certificate up by its ID. A mapping returns empty strings for a key
 *  that was never written, so "all four fields empty" means "not found". */
export async function fetchCertificate(id: string): Promise<Certificate | null> {
  return withReadProvider(async (provider) => {
    const contract = new Contract(CONTRACT_ADDRESS, CERT_ABI, provider);
    const r = await contract.certificates(id);
    const cert: Certificate = { name: r[0], certificateId: r[1], courseName: r[2], issueDate: r[3] };
    return cert.name || cert.certificateId || cert.courseName || cert.issueDate ? cert : null;
  });
}

/** A fresh transaction can take a moment to show up on the read node. */
export async function fetchCertificateWithRetry(id: string, tries = 5, delayMs = 1500): Promise<Certificate | null> {
  for (let i = 0; i < tries; i++) {
    const cert = await fetchCertificate(id);
    if (cert) return cert;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/** Sends issue_cert through the user's wallet. `onSent` fires as soon as the
 *  transaction hash exists, before it is mined. */
export async function issueCertificate(
  cert: Certificate,
  onSent: (hash: string) => void,
): Promise<{ hash: string; blockNumber: number }> {
  if (!window.ethereum) throw new Error("MetaMask isn’t available in this browser.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, CERT_ABI, signer);
  const tx = await contract.issue_cert(cert.name, cert.certificateId, cert.courseName, cert.issueDate);
  onSent(tx.hash);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("The transaction failed on-chain.");
  return { hash: tx.hash, blockNumber: receipt.blockNumber };
}
