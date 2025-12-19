'use client';

/**
 * PaymentHistory Component
 * Displays payment history with receipts
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Receipt, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useBillingStore, formatPrice } from '@/stores/billing-store';

interface PaymentHistoryProps {
  className?: string;
  limit?: number;
}

export function PaymentHistory({ className, limit }: PaymentHistoryProps) {
  const t = useTranslations('billing');
  const { paymentHistory, isLoadingHistory, fetchPaymentHistory } = useBillingStore();

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('paymentStatus.succeeded')}
          </Badge>
        );
      case 'pending':
      case 'processing':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('paymentStatus.pending')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('paymentStatus.failed')}
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="outline">
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('paymentStatus.refunded')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const displayedPayments = limit ? paymentHistory.slice(0, limit) : paymentHistory;

  if (isLoadingHistory) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {t('paymentHistory')}
        </CardTitle>
        <CardDescription>{t('paymentHistoryDescription')}</CardDescription>
      </CardHeader>

      <CardContent>
        {displayedPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('noPayments')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('receipt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payment.description || t('subscriptionPayment')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.receiptUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('viewReceipt')}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {limit && paymentHistory.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <a href="/billing/history">{t('viewAllPayments')}</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentHistory;
