import { analyticsService } from "@/services/insightService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Card, CardHeader } from "@/components/ui/primitives";
import { ErrorState, InlineLoading } from "@/components/ui/feedback";
import { BarList, ColumnChart, DonutChart } from "@/components/ui/charts";

export default function AnalyticsPage() {
  const { data, loading, error, reload } = useAsync(() => analyticsService.getAnalytics(), []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Demographic and transaction indicators derived from the barangay inhabitant registry."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Analytics" }]}
      />

      <PrototypeNotice compact />

      {loading && (
        <Card>
          <InlineLoading label="Computing indicators…" />
        </Card>
      )}
      {error && !loading && (
        <Card>
          <ErrorState title="Unable to load analytics" description={error} onRetry={reload} />
        </Card>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Population by age group" description="Residents grouped into standard brackets." />
              <div className="p-4">
                <BarList data={data.ageDistribution} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Population by sex" />
              <div className="p-4">
                <DonutChart data={data.sexDistribution} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Voter registration" description="Registered vs. unregistered residents." />
              <div className="p-4">
                <DonutChart data={data.voterDistribution} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Document request volume"
                description="Certificates and clearances filed over the last six months."
              />
              <div className="p-4">
                <ColumnChart
                  data={data.documentVolume.map((m) => ({
                    label: m.month,
                    values: [m.certificates, m.clearances],
                  }))}
                  seriesLabels={["Certificates", "Clearances"]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Population by purok" description="Distribution of registered inhabitants." />
              <div className="p-4">
                <BarList data={data.populationByPurok} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Household size distribution" description="Number of households per size bracket." />
              <div className="p-4">
                <BarList data={data.householdSize} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Blotter cases by status" />
              <div className="p-4">
                <BarList data={data.blotterByStatus} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Special sectors" description="Counts used for programme targeting." />
              <div className="p-4">
                <BarList data={data.specialSectors} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Civil status distribution" />
            <div className="p-4">
              <BarList data={data.civilStatus} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
