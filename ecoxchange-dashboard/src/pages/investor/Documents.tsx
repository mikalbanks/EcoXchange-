import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DocumentCard } from "../../components/investor/DocumentCard.js";

const DOCUMENTS = [
  {
    title: "Private Placement Memorandum",
    description: "Offering terms, risk factors, and disclosures for the project.",
  },
  {
    title: "Subscription Agreement",
    description: "Your subscription terms and signature package.",
  },
  {
    title: "PPA Contract",
    description: "Power purchase agreement governing revenue for the project.",
  },
];

export function Documents() {
  const { id = "" } = useParams();

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to={`/investor/project/${id}`}
        className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Project
      </Link>

      <div>
        <h1 className="font-heading text-3xl text-darkBg">Document Vault</h1>
        <p className="text-textMuted mt-1">
          Secure project documents. Downloads unlock once compliance setup is
          complete.
        </p>
      </div>

      <div className="rounded-lg bg-paleGreen/30 border border-paleGreen/60 px-4 py-3 text-sm text-textMuted">
        Coming soon — document delivery is pending compliance setup.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {DOCUMENTS.map((d) => (
          <DocumentCard
            key={d.title}
            title={d.title}
            description={d.description}
          />
        ))}
      </div>
    </div>
  );
}
